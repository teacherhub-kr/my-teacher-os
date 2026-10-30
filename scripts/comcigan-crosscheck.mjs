/**
 * Compare teacher-index view with the independently parsed classroom view.
 * Returns a fixed status only; never returns names, timetable cells or school IDs.
 */
const weekDays={'월':1,'화':2,'수':3,'목':4,'금':5};
const compact=v=>String(v??'').replace(/\s+/g,'').replace(/\*+$/g,'');
export function compareTimetableViews(slots,classRaw,maskedName) {
  const prefix=compact(maskedName);
  if(prefix.length!==2)return 'identity-invalid';
  if(!Array.isArray(slots)||!slots.length||slots.length>40)return 'teacher-invalid';
  if(!classRaw||typeof classRaw!=='object'||Array.isArray(classRaw))return 'class-invalid';
  const fromTeacher=new Map(),usedPeriods=new Set();
  for(const item of slots){
    const day=weekDays[item?.day],period=Number(item?.period),target=String(item?.target||'');
    const subject=compact(item?.subject);
    if(!day||!Number.isInteger(period)||period<1||period>8|| !/^[123]-\d{1,2}$/.test(target)||
       !subject||subject.length>32)return 'teacher-invalid';
    const key=target+'|'+day+'|'+period;
    const time=day+'|'+period;
    if(fromTeacher.has(key)||usedPeriods.has(time))return 'teacher-conflict';
    fromTeacher.set(key,subject);usedPeriods.add(time);
  }
  const fromClass=new Map();
  for(const [grade,rooms] of Object.entries(classRaw)){
    if(!/^[123]$/.test(grade)||!rooms||typeof rooms!=='object')continue;
    for(const [room,days] of Object.entries(rooms)){
      if(!/^\d{1,2}$/.test(room)||!days||typeof days!=='object')continue;
      for(const [day,periods] of Object.entries(days)){
        if(!/^[1-5]$/.test(day)||!periods||typeof periods!=='object')continue;
        for(const [period,item] of Object.entries(periods)){
          if(!/^[1-8]$/.test(period)||!item||typeof item!=='object')continue;
          if(compact(item.teacher)!==prefix)continue;
          const subject=compact(item.subject);
          if(!subject||subject.length>32)return 'class-invalid';
          if(item.grd!=null&&Number(item.grd)!==Number(grade))return 'class-invalid';
          if(item.cls!=null&&Number(item.cls)!==Number(room))return 'class-invalid';
          const key=grade+'-'+Number(room)+'|'+Number(day)+'|'+Number(period);
          if(fromClass.has(key))return 'class-conflict';
          fromClass.set(key,subject);
        }
      }
    }
  }
  if(!fromClass.size)return 'class-empty';
  if(fromClass.size!==fromTeacher.size)return 'count-mismatch';
  for(const [key,subject] of fromTeacher){
    if(!fromClass.has(key)||fromClass.get(key)!==subject)return 'content-mismatch';
  }
  return 'match';
}
