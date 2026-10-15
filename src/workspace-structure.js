/* 页面结构原先只存在于前端常量中，因此导航和页面无法编辑。
   轻量结构保存在现有 requirements 数据源的独立记录中，和正文一样受编辑密码保护。 */
let workspaceStructureKey='workspace:structure:v2';
let workspaceStructure={documentTitle:'需求说明'};
const clone=value=>JSON.parse(JSON.stringify(value));
function serialiseWorkspacePage(page){const base={id:page.id,name:page.name,group:page.group,hidden:Boolean(page.hidden),custom:Boolean(page.__workspaceCustom)};return base.custom?{...base,pageNote:clone(page.pageNote),states:clone(page.states)}:base}
function workspaceStructurePayload(){return JSON.stringify({documentTitle:workspaceStructure.documentTitle||'需求说明',pages:data.pages.map(serialiseWorkspacePage),releases:data.releases.map(item=>({id:item.id,name:item.name,hidden:Boolean(item.hidden),custom:Boolean(item.__workspaceCustom),changes:item.__workspaceCustom?clone(item.changes):undefined}))})}
async function persistWorkspaceStructure(){if(!ensureEditorAccess())return false;const html=workspaceStructurePayload();try{const response=await fetch('/api/requirements',{method:'POST',headers:requirementsWriteHeaders(),body:JSON.stringify({key:workspaceStructureKey,html})});if(!response.ok)throw new Error();savedRequirements[workspaceStructureKey]=html;workspaceStructure=JSON.parse(html);showToast('页面结构已保存');return true}catch{showToast('保存失败，请确认已通过 Node 服务启动');return false}}
function loadWorkspaceStructure(){const raw=savedRequirements[workspaceStructureKey];if(!raw)return;try{const saved=JSON.parse(raw);if(!Array.isArray(saved.pages))return;workspaceStructure.documentTitle=typeof saved.documentTitle==='string'&&saved.documentTitle.trim()?saved.documentTitle.trim():'需求说明';const known=new Map(data.pages.map(page=>[page.id,page])),ordered=[];saved.pages.forEach(entry=>{if(!entry||typeof entry.id!=='string')return;let page=known.get(entry.id);if(page){page.name=typeof entry.name==='string'&&entry.name.trim()?entry.name.trim():page.name;page.group=typeof entry.group==='string'&&entry.group.trim()?entry.group.trim():page.group;page.hidden=Boolean(entry.hidden)}else if(entry.custom&&entry.pageNote&&Array.isArray(entry.states)){page={id:entry.id,name:entry.name||'未命名页面',group:entry.group||'未分组',hidden:Boolean(entry.hidden),__workspaceCustom:true,pageNote:entry.pageNote,states:entry.states.length?entry.states:[{id:'default',name:'默认态',stateNote:{rule:'请补充当前页面状态说明。'}}]}}if(page){ordered.push(page);known.delete(entry.id)}});data.pages.splice(0,data.pages.length,...ordered,...known.values());if(Array.isArray(saved.releases)){const knownReleases=new Map(data.releases.map(item=>[item.id,item])),orderedReleases=[];saved.releases.forEach(entry=>{if(!entry||typeof entry.id!=='string')return;let item=knownReleases.get(entry.id)||knownReleases.get(entry.sourceId);if(item){item.id=entry.id;item.name=entry.name||item.name;item.hidden=Boolean(entry.hidden)}else if(entry.custom){item={id:entry.id,name:entry.name||'新版本',changes:Array.isArray(entry.changes)?entry.changes:[],hidden:Boolean(entry.hidden),__workspaceCustom:true}}if(item){orderedReleases.push(item);knownReleases.delete(entry.id);if(entry.sourceId)knownReleases.delete(entry.sourceId)}});data.releases.splice(0,data.releases.length,...orderedReleases,...knownReleases.values())}}catch{/* 忽略旧版或损坏记录，继续使用内置导航。 */}}
function pageTree(){const visible=data.pages.filter(page=>!page.hidden),groups=[...new Set(visible.map(page=>page.group))],row=page=>`<div class="page-node" data-page-row="${escape(page.id)}"><button class="page-select" data-page="${escape(page.id)}" data-first-state="${escape(page.states[0]?.id||'default')}"><i class="dot"></i><span>${escape(page.name)}</span></button></div>`;return `${groups.map(group=>`<section class="page-group"><div class="tree-title-row"><h3>${escape(group)}</h3><button type="button" class="tree-group-edit" data-nav-action="rename-group" data-group="${escape(group)}" title="修改导航分组">✎</button></div>${visible.filter(page=>page.group===group).map(row).join('')}</section>`).join('')}<div class="nav-editor"><button type="button" data-nav-action="add-group">＋ 分组</button></div>`}
function nextPageId(){return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`}
async function workspaceNavigationAction(action,group){if(!ensureEditorAccess())return;if(action==='add-page'||action==='add-group'){const name=action==='add-page'?window.prompt('页面名称','新页面'):'新页面';if(!name?.trim())return;const groupName=action==='add-page'?window.prompt('放入哪个导航分组？',data.pages.find(page=>!page.hidden)?.group||'未分组'):window.prompt('导航分组名称','新分组');if(!groupName?.trim())return;const page={id:nextPageId(),name:name.trim(),group:groupName.trim(),__workspaceCustom:true,pageNote:{description:'请填写此页面的需求说明。',path:'待补充进入路径。',modules:[]},states:[{id:'default',name:'默认态',stateNote:{rule:'请补充当前页面的状态规则。'}}]};data.pages.push(page);state.tree='page';state.pageId=page.id;state.stateId='default';state.selectedChange=null;state.noteMode='page';await persistWorkspaceStructure();renderAll();return}if(action==='rename-group'){const next=window.prompt('导航分组名称',group);if(!next?.trim()||next.trim()===group)return;data.pages.filter(page=>page.group===group).forEach(page=>page.group=next.trim());await persistWorkspaceStructure();renderTree()}}
function cleanEditorUi(content){content?.querySelectorAll('[data-editor-ui]').forEach(node=>node.remove())}
function requirementEditor(){return $('.requirements-editor')}function editableRequirementContent(){const content=requirementEditor()?.querySelector('.requirements-editor-content');return content?.isContentEditable?content:null}
function focusText(node){if(!node)return;const range=document.createRange();range.selectNodeContents(node);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);node.focus?.()}
function selectedRequirementSection(content){const selection=window.getSelection(),node=selection?.anchorNode?.nodeType===Node.TEXT_NODE?selection.anchorNode.parentElement:selection?.anchorNode;return node?.closest?.('.requirement-section')||content.querySelector(':scope > .requirement-section:last-of-type')}
function selectedTableCell(){const selection=window.getSelection(),node=selection?.anchorNode?.nodeType===Node.TEXT_NODE?selection.anchorNode.parentElement:selection?.anchorNode;return node?.closest?.('td,th')}
function requirementTableGrid(table){const grid=[],positions=new Map();[...table.rows].forEach((row,r)=>{grid[r]||=[];let column=0;[...row.cells].forEach(cell=>{while(grid[r][column])column++;positions.set(cell,column);for(let y=r;y<r+cell.rowSpan;y++){grid[y]||=[];for(let x=column;x<column+cell.colSpan;x++)grid[y][x]=cell}column+=cell.colSpan})});return {grid,positions,width:Math.max(0,...grid.map(row=>row.length))}}
function requirementMergeSelection(selection,content){
  if(!content||!selection?.rangeCount||selection.isCollapsed)return null;
  const cellFor=node=>(node?.nodeType===Node.TEXT_NODE?node.parentElement:node)?.closest?.('td,th');
  const first=cellFor(selection.anchorNode),last=cellFor(selection.focusNode);
  if(!first||!last||first===last||!content.contains(first)||!content.contains(last))return null;
  const table=first.closest('table');
  if(!table||last.closest('table')!==table||first.parentElement.parentElement!==last.parentElement.parentElement)return null;
  const rows=[...table.rows],layout=requirementTableGrid(table);
  const firstRow=rows.indexOf(first.parentElement),lastRow=rows.indexOf(last.parentElement);
  const firstColumn=layout.positions.get(first),lastColumn=layout.positions.get(last);
  if(firstRow<0||lastRow<0||firstColumn===undefined||lastColumn===undefined)return null;
  const top=Math.min(firstRow,lastRow),bottom=Math.max(firstRow+first.rowSpan-1,lastRow+last.rowSpan-1);
  const left=Math.min(firstColumn,lastColumn),right=Math.max(firstColumn+first.colSpan-1,lastColumn+last.colSpan-1);
  const cells=new Set();
  for(let row=top;row<=bottom;row++){
    if(rows[row]?.parentElement!==rows[top].parentElement)return null;
    for(let column=left;column<=right;column++){
      const cell=layout.grid[row]?.[column];
      if(!cell)return null;
      const originRow=rows.indexOf(cell.parentElement),originColumn=layout.positions.get(cell);
      if(originRow<top||originColumn<left||originRow+cell.rowSpan-1>bottom||originColumn+cell.colSpan-1>right)return null;
      cells.add(cell);
    }
  }
  if(cells.size<2)return null;
  return {table,rows,layout,top,bottom,left,right,cells,target:layout.grid[top][left]};
}
function mergeRequirementTableCells(){
  const session=editorSession;
  const selected=requirementMergeSelection(window.getSelection(),session?.content);
  if(!session?.editing||!selected){showToast('请在同一表格中选中相邻的多个单元格');return}
  const {rows,top,bottom,left,right,cells,target}=selected;
  for(let row=top;row<=bottom;row++){
    for(const cell of [...rows[row].cells]){
      if(cell===target||!cells.has(cell))continue;
      const hasContent=cell.textContent.trim()||cell.querySelector('img,table,svg,video,br');
      if(hasContent){
        if(target.textContent.trim()||target.querySelector('img,table,svg,video,br'))target.append(document.createElement('br'));
        while(cell.firstChild)target.append(cell.firstChild);
      }
      cell.remove();
    }
  }
  target.rowSpan=bottom-top+1;
  target.colSpan=right-left+1;
  focusText(target);
  session.range=window.getSelection().getRangeAt(0).cloneRange();
}
function unmergeRequirementTableCell(){
  const session=editorSession,cell=selectedTableCell(),table=cell?.closest('table');
  if(!session?.editing||!cell||!session.content.contains(cell)||!table)return;
  const height=cell.rowSpan,width=cell.colSpan;
  if(height<=1&&width<=1)return;
  const rows=[...table.rows],layout=requirementTableGrid(table);
  const top=rows.indexOf(cell.parentElement),left=layout.positions.get(cell);
  if(top<0||left===undefined)return;
  cell.rowSpan=1;
  cell.colSpan=1;
  for(let row=top;row<top+height;row++){
    for(let column=left;column<left+width;column++){
      if(row===top&&column===left)continue;
      const part=document.createElement(cell.tagName.toLowerCase());
      const following=[...rows[row].cells].find(existing=>layout.positions.get(existing)>column);
      rows[row].insertBefore(part,following||null);
    }
  }
  focusText(cell);
  session.range=window.getSelection().getRangeAt(0).cloneRange();
}
function changeRequirementTable(action,targetRow){
  const content=editableRequirementContent(),cell=selectedTableCell(),table=cell?.closest('table');
  if(!content||!table){showToast('请先将光标放入表格单元格');return}
  const row=targetRow?.isConnected&&targetRow.closest('table')===table?targetRow:cell.parentElement;
  const rows=[...table.rows],rowIndex=rows.indexOf(row),layout=requirementTableGrid(table),column=layout.positions.get(cell);
  if(action==='add-row'){
    const next=document.createElement('tr');
    const occupied=new Set();
    layout.grid[rowIndex+1]?.forEach((source,index)=>{if(source&&rows.indexOf(source.parentElement)<=rowIndex&&rows.indexOf(source.parentElement)+source.rowSpan>rowIndex+1){occupied.add(index);source.rowSpan++}});
    for(let index=0;index<layout.width;index++)if(!occupied.has(index)){const part=document.createElement(row.parentElement.tagName==='THEAD'?'th':'td');part.textContent='内容';next.append(part)}
    row.after(next);
  }else if(action==='delete-row'){
    if(rows.length<=1){showToast('表格至少保留一行');return}
    const nextRow=rows[rowIndex+1];
    const spanningCells=new Set(layout.grid[rowIndex]||[]);
    spanningCells.forEach(source=>{
      const start=rows.indexOf(source.parentElement);
      if(start<rowIndex&&start+source.rowSpan>rowIndex)source.rowSpan--;
    });
    if(nextRow){
      [...row.cells].forEach(source=>{
        if(source.rowSpan<=1)return;
        source.rowSpan--;
        const sourceColumn=layout.positions.get(source);
        const following=[...nextRow.cells].find(existing=>layout.positions.get(existing)>sourceColumn);
        nextRow.insertBefore(source,following||null);
      });
    }
    row.remove();
    editorSession.range=null;
  }else if(action==='add-column'){
    rows.forEach(current=>{const part=document.createElement(current.parentElement.tagName==='THEAD'?'th':'td');part.textContent=part.tagName==='TH'?'列标题':'内容';const following=[...current.cells].find(existing=>layout.positions.get(existing)>column);current.insertBefore(part,following||null)});
  }else if(action==='delete-column'){
    if(layout.width<=1){showToast('表格至少保留一列');return}
    const affected=new Set(layout.grid.map(cells=>cells[column]).filter(Boolean));
    affected.forEach(target=>{if(target.colSpan>1)target.colSpan--;else target.remove()});
  }
}
