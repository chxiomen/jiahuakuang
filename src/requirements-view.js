function renderAll(){syncWorkspaceMode();renderTree();renderTools();renderPhone();syncRenewalPreview();renderRenewalToggle();bindRenewalFooter();renderNotes()}

/* 正文只来自 /api/requirements。旧版内置样例仅保留作开发历史，绝不能在读取失败时展示或写回。 */
let requirementsLoadError='';
let requirementsLoadSucceeded=false;
function missingRequirementNote(){
  const detail=requirementsLoadError?'暂时无法读取已保存的需求内容。请检查数据服务后刷新页面。':'这部分内容尚未保存，因而不会用旧版本或模板内容替代。';
  return `<article class="requirements-note" role="status" style="padding:22px;border:1px solid #f1d7a8;border-radius:12px;background:#fffaf0;color:#6d5732;line-height:1.75"><strong>内容未加载</strong><p style="margin:8px 0 0">${detail}</p></article>`;
}
const requirementsNoteFromSavedData=requirementsNote;
requirementsNote=function(req,key){
  if(req.states)return stateRequirementsNote(req,key);
  return Object.prototype.hasOwnProperty.call(savedRequirements,key)||requirementsLoadSucceeded?requirementsNoteFromSavedData(req,key):missingRequirementNote();
};
