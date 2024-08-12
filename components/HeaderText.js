export function HeaderByModalType(form, formType) {
    const headerText = form.querySelector("#modalTypeText");
    if (headerText) {  // headerText가 null이 아닌지 확인
        // TODO: StaticText 객체화
        switch (formType) {
            case 'get':
                headerText.textContent = '조회';
                break;
            case 'post':
                headerText.textContent = '등록';
                break;
            case 'update':
                headerText.textContent = '수정';
                const date = form.querySelector("#date");
                if (date) {
                    date.setAttribute('readonly', true);
                    date.addEventListener('keydown', (event) => {
                        event.preventDefault();
                    });
                }
                break;
        }
    }
}
