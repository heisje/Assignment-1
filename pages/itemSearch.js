
import { useQuery } from '../customhook/useQuery.js';
import { Data } from '../data/data.js';
import { ItemVM } from '../ViewModel/ItemVM.js';
import { CheckTableVM } from '../ViewModel/CheckTableVM.js';
import { OItemTableUI } from '../ObservingUI/Table/OItemTableUI.js';
import { OPageState, OSortState, OTableState } from '../ObservingUI/OState.js';
import { OPaginationUI } from '../ObservingUI/Pagination/OPaginationUI.js';
import { InitOrder } from '../ViewModel/SearchTable.js';
import { OSortUI } from '../ObservingUI/Sort/OSortUI.js';

document.addEventListener('DOMContentLoaded', async () => {
    const queryData = useQuery();
    const formType = queryData?.['modal-type'];

    // 데이터
    const dataManager = new Data('item');

    // Model View 1:1 매칭
    const itemTable = new OItemTableUI();
    OTableState.register(itemTable);
    const paginationUi = new OPaginationUI();
    OPageState.register(paginationUi);

    // Sort상태 초기화
    const defaultOrder = new Map([
        ["PROD_CD", "ASC"],
    ]);
    OSortState.update(defaultOrder);
    const sortUI = new OSortUI();
    OSortState.register(sortUI);



    new ItemVM(formType, true, dataManager, null, 10);
    new CheckTableVM();
});
