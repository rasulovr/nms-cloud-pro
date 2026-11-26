import {qrBuilderApplyOrder} from './qrMenuBuilder.mjs';

const customId=/^cat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const records=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const failures={
  protected:'Это системная категория. Её нельзя удалить в конструкторе.',
  destination:'Выбери другую категорию для переноса всех позиций.',
  invalid:'Не удалось безопасно перенести все позиции. Черновик не изменён.'
};

export function qrBuilderCanRemoveCategory(doc,base,category){
  return typeof category==='string'&&customId.test(category)&&Object.hasOwn(records(doc?.categories),category)
    &&!base.some(item=>item.category===category);
}

// Native BC1/BC2 may return a builder-created row with the last *published*
// category's display name, not the builder's current draft category ID.
export function qrBuilderCategorySources(base,items){
  return base.map(p=>{
    const entry=items[String(p.id)];
    if(entry?.kind!=='new')return p;
    return entry.category&&p.category!==entry.category?{...p,category:entry.category,categoryNames:null}:p;
  }).filter(p=>p.category&&!customId.test(p.category));
}

export function qrBuilderDeleteCategory({doc,base,source,destination}){
  if(!qrBuilderCanRemoveCategory(doc,base,source))return {error:failures.protected};
  const items=records(doc.items), categories=records(doc.categories);
  // Include hidden and non-loaded/orphaned overrides, not just guest cards.
  const ids=new Set([...base.map(p=>String(p.id)),...Object.keys(items)]);
  const moving=[...ids].filter(id=>items[id]?.category===source).map(id=>({...items[id],id}));
  if(moving.length){
    const legal=typeof destination==='string'&&Boolean(destination)&&destination!==source
      &&(Object.hasOwn(categories,destination)||qrBuilderCategorySources(base,items).some(p=>p.category===destination));
    if(!legal)return {error:failures.destination};
    if(moving.some(x=>!['existing','new'].includes(x.kind)))return {error:failures.invalid};
  }
  const nextItems={...items}, nextCategories={...categories}, nextOrder={...records(doc.order)};
  const movedIds=qrBuilderApplyOrder(moving,doc).map(x=>x.id);
  for(const id of movedIds)nextItems[id]={...items[id],category:destination};
  delete nextCategories[source];
  delete nextOrder[source];
  if(movedIds.length){
    const old=Array.isArray(nextOrder[destination])?nextOrder[destination]:[];
    const movedSet=new Set(movedIds);
    const prior=old.filter(id=>!movedSet.has(id));
    // Keep the existing explicit and default ordering intact. Appended dishes
    // follow both groups, even when the destination had no explicit order.
    nextOrder[destination]=[...prior,...(prior.includes(null)?[]:[null]),...movedIds];
  }
  return {document:{...doc,categories:nextCategories,items:nextItems,order:nextOrder},moved:movedIds};
}
