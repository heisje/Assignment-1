import { queryObjectToURL } from "../util/query.js";
import { Modal } from "../modal/modal.js";
import { Button } from "../components/Button.js";
import { Data } from "../data/data.js";
import { useQuery } from "../customhook/useQuery.js";
import { Pagination } from "../components/Pagination.js";
import { FuncButton } from "../components/FunButton.js";

export class Form {

    constructor(formSelector, formType, dataManager = new Data(), defaultData, pageSize = 10) {
        this.form = document.querySelector(formSelector);
        this.tbody = document.getElementById('table-body');
        this.dataManager = dataManager;     // 데이터 관리용 클래스
        this.currentPage = 1;               // 현재 페이지
        this.pageSize = pageSize;           // 페이지네이션 최대 사이즈
        this.formType = formType;           // 타입별 버튼 부착용
        this.defaultData = defaultData;     // 초기데이터

        // 현재 데이터
        // 현재 데이터를 저장한 이유: 잦은 참조가 필요하다. 
        // html에 data-로 데이터를 저장할 수는 있지만, 잦은 DOM API호출은 성능상 이점이 없다 생각된다. 
        //    // 그래서 ID를 ROW마다 참조해두고, 현재데이터에서 뽑아 쓰는 방식으로 구현
        //    // Index참조와 Hash참조가 필요하기 때매 Map으로 구현
        // TODO: 데이터 참조 시작점을 이 객체로 변경
        this.currentMapData = defaultData;     // 현재 데이터

        const headerText = this.form.querySelector("#modalTypeText");

        if (headerText) {  // headerText가 null이 아닌지 확인
            // TODO: StaticText 객체화
            switch (this.formType) {
                case 'get':
                    headerText.textContent = '조회';
                    break;
                case 'post':
                    headerText.textContent = '등록';
                    break;
                case 'update':
                    headerText.textContent = '수정';
                    const date = this.form.querySelector("#date");
                    if (date) {  // headerText가 null이 아닌지 확인
                        date.setAttribute('readonly', true);
                        date.addEventListener('keydown', (event) => {
                            event.preventDefault();
                        });
                    }
                    break;
            }
        }
        if (this.form) {
            this._initForm();
        }
    }

    // 폼의 형태에 맞춰서 버튼 부착
    _initForm() {
        this._initFormButtons();

        this.form.querySelectorAll('.onSearchButton').forEach(button => {
            button.addEventListener("click", () => this._loadSearchData(this.currentPage));
        })

        this.form.querySelectorAll(".openWindow").forEach(button => {
            button.addEventListener("click", (event) => this._handleOpenWindow(event));
        });

        this.form.querySelectorAll("[data-pagi]").forEach(button => {
            button.addEventListener('click', (event) => this._handlePagination(event));
        });

        const deleteButton = this.form.querySelector('.deleteButton');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => this._handleDeleteSelected());
        }

        this._handleReset(); // Initialize the form with query data

        window.addEventListener("message", (event) => {
            if (event.data?.messageType === 'set-items') {
                const container = document.getElementById('search-items');
                event?.data?.items.forEach((item) => {
                    const button = FuncButton({
                        text: `${item?.id}(${item?.name})`, parent: container,
                        attributes: [{ qualifiedName: 'data-id', value: item?.id }],
                    });
                    const itemInput = document.getElementById('item');
                    if (itemInput) {
                        itemInput.value = event?.data?.items?.[0]?.id
                    }
                    button.addEventListener('click', () => { button.remove() });
                })

                // document.getElementById('item').value = event?.data?.ids;
            }
            if (event.data?.messageType === 'reSearchData') {
                this._loadSearchData(this.currentPage);
            }
        });

        try {
            this._loadSearchData(this.currentPage);

            const selectAllButton = this.form.querySelector('#selectAll');

            const query = useQuery();
            const selectCount = query?.['get-count'];
            if (selectCount >= 0) {
                selectAllButton.style.display = 'none';

                const checkboxes = this.form.querySelectorAll('input[type="checkbox"]');

                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', (event) => {
                        const checkedCheckboxes = this.form.querySelectorAll('input[type="checkbox"]:checked');

                        if (checkedCheckboxes.length > selectCount) {
                            event.target.checked = false;

                            alert(`최대 ${selectCount}개 항목만 선택할 수 있습니다.`);
                        }
                    });
                });
            }

            if (selectAllButton) {
                selectAllButton.addEventListener("click", function (event) {
                    const checkboxes = this.form.querySelectorAll('tbody input[type="checkbox"]');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = event.target.checked;
                    });
                });
            }


        } catch (e) {
            console.log(e);
        }
    }

    _handleDeleteSelected() {
        const selectedIds = this._getSelectedRowIds();
        if (selectedIds.length > 0) {
            selectedIds.forEach(id => this.dataManager.deleteDataById(id));
            alert(`${selectedIds.length}개의 항목이 삭제되었습니다.`);
            this._loadSearchData(this.currentPage); // Refresh the data
        } else {
            alert('선택된 항목이 없습니다.');
        }
    }

    _initFormButtons() {
        const formButtons = document.getElementById('formButtons');
        if (!formButtons) return;

        if (this.formType === 'get') {
            new Button({
                text: '적용', classes: ['primary-button'],
                onClick: () => {
                    if (this._getSelectedRowIds().length === 0) {
                        alert('체크된 항목이 없습니다.');
                        return;
                    }
                    const ids = this._getSelectedRowIds();
                    const items = ids.map((id) => this.currentMapData.get(id));
                    const message = {
                        // TODO: 메세지 타입 분할
                        messageType: 'set-items',
                        items,
                        ids: this._getSelectedRowIds(),
                    }
                    window.opener.postMessage(message, window.location.origin);
                    window.close();
                }, parent: formButtons
            });
        }

        if (this.formType === 'post') {
            new Button({
                text: '저장', classes: ['primary-button'], onClick: (event) => {
                    this._handleSave(event);
                }, parent: formButtons
            });
        }

        if (this.formType === 'update') {
            new Button({ text: '변경', classes: ['primary-button', 'onUpdateButton'], onClick: (event) => { this._handleUpdate(event) }, parent: formButtons });
            new Button({ text: '삭제', onClick: () => this._handleDelete(), parent: formButtons });
        }

        if (this.formType === 'post' || this.formType === 'update') {
            new Button({ text: '다시작성', onClick: () => this._handleReset(), parent: formButtons });
        }

        if (this.formType) {
            new Button({ text: '닫기', onClick: () => window.close(), parent: formButtons });
        }

    }

    // GET
    _getFormData() {
        // TODO : button의 data-id를 다 가져와야함 
        const formData = new FormData(this.form);
        const dataObject = {};
        formData.forEach((value, key) => {
            dataObject[key] = value;
        });

        return dataObject;
    }



    // POST
    _handleSave(event) {
        event.preventDefault();

        const key = this._validateFormData(this.requiredKeys);
        if (key != true) {
            alert(`${key}를 채워주세요.`);
            return;
        }

        const dataObject = this._getFormData();

        this.dataManager.appendDataWithId(dataObject);
        alert('Data saved to LocalStorage');
        this._sendMessage({ messageType: 'reSearchData' });
        window.close();
    }

    // UPDATE
    _handleUpdate(event) {
        event.preventDefault();

        const key = this._validateFormData(this.requiredKeys);
        if (key != true) {
            alert(`${key}를 채워주세요.`);
            return;
        }

        const dataObject = this._getFormData();
        if (!dataObject.id) {
            this.defaultData?.id;
        }
        this.dataManager.updateData(this.defaultData?.id, dataObject);

        alert('Data updated in LocalStorage');
        this._sendMessage({ messageType: 'reSearchData' });
        window.close();
    }

    // DELETE
    _handleDelete = () => {
        this.dataManager.deleteDataById(this.defaultData?.id);
        alert(`${this.defaultData?.id}가 삭제되었습니다.`)
        this._sendMessage({ messageType: 'reSearchData' });
        window.close();
    }

    // OPEN NEW MODAL
    _handleOpenWindow(event) {
        const href = event.currentTarget.getAttribute("data-href");
        const openType = event.currentTarget.getAttribute("data-query-modal-type");

        // data-query-..로 정의해논 데이터를 전부 쿼리로 생성
        const queryObject = {};

        Array.from(event.currentTarget.attributes).forEach(attr => {
            if (attr.name.startsWith('data-query-')) {
                const key = attr.name.replace('data-query-', '');
                const value = attr.value;
                queryObject[key] = value;
            }
        });

        const row = event.currentTarget.closest('tr');
        if (row) {
            const id = row.getAttribute('id');
            queryObject['id'] = id;
        }

        const url = queryObjectToURL(href, queryObject);

        new Modal(url, openType);
    }

    // FORM RESET
    _handleReset = () => {
        this.form.querySelectorAll('input').forEach(input => {
            if (input.name && this.defaultData[input.name]) {
                input.value = this.defaultData[input.name];
            } else {
                input.value = '';
            }
        });
    }

    // TABLE GET - 주로 마지막에 실행됨
    _loadSearchData(pageNumber = 1) {
        const formObject = this._getFormData();

        const data = this.dataManager.searchData(formObject);
        const pagintionedData = this.dataManager.pagintionedData(data, pageNumber);

        if (!this.tbody) return;
        this.tbody.innerHTML = ''; // 기존 데이터 삭제

        Pagination(pagintionedData?.currentPage, pagintionedData?.totalPage,
            (index) => {
                console.log(index.target.textContent);
                this._handleIndexPagination(index.target.textContent);
            }
        );

        this._updateCurrentMapData(pagintionedData?.items);
        this._rowMaker(this.tbody, pagintionedData);
    }

    // 상태변경 = Save Current Rows Data,  using MAP
    // TODO : DATA 클래스로 넘기기
    _updateCurrentMapData(data = []) {
        const currentDataObjcet = new Map();
        data.forEach((item) => {
            currentDataObjcet.set(item?.id, { ...item });
        })
        this.currentMapData = currentDataObjcet;
    }


    // TABLE GET PAGINATION
    _handlePagination = (event) => {
        const direction = parseInt(event.currentTarget.getAttribute('data-pagi'), 10);
        const totalPages = Math.ceil(this.dataManager.loadData().length / this.dataManager.pageSize);

        if (this.currentPage + direction < 1) {
            this.currentPage = 1; // 페이지 번호가 1보다 작아지지 않도록 방지
        }
        else if (this.currentPage + direction <= totalPages) {
            this.currentPage += direction;
        } else if (totalPages < this.currentPage + direction) {
            this.currentPage = totalPages
        }

        this._loadSearchData(this.currentPage);
        document.getElementById("currentPage").textContent = this.currentPage;
    }

    // TABLE GET PAGINATION
    _handleIndexPagination = (index) => {
        const direction = parseInt(index);
        const totalPages = Math.ceil(this.dataManager.loadData().length / this.dataManager.pageSize);

        if (direction < 1) {
            this.currentPage = 1; // 페이지 번호가 1보다 작아지지 않도록 방지
        }
        else if (direction <= totalPages) {
            this.currentPage = direction;
        } else if (totalPages < direction) {
            this.currentPage = totalPages
        }

        this._loadSearchData(this.currentPage);
        document.getElementById("currentPage").textContent = this.currentPage;
    }



    // CREATE ROW 자식컴포넌트에서 구현
    _rowMaker(parent, data) {
        // 자식에서 구현
    }

    // TABLE GET ID
    _getSelectedRowIds() {
        const selectedIds = [];
        const checkboxes = document.querySelectorAll('#table-body input[type="checkbox"]:checked');

        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            if (row && row.id) {
                selectedIds.push(row.id);
            }
        });

        return selectedIds;
    }

    // MESSAGE
    _sendMessage(message = { messageType: 'reSearchData' }) {
        window.opener.postMessage(message, window.location.origin);
    }

    // Util
    _validateFormData(requiredKeys = []) {
        const formData = this._getFormData();
        for (let key of requiredKeys) {
            if (formData[key] === undefined || formData[key] === null || formData[key] === '') {
                return key;
            }
        }
        return true;
    }
}
