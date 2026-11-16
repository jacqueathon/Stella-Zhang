export function milestoneStyle(event){
 const text=(event.title+' '+(event.detail||event.fact||'')).toLowerCase();
 if(event.kind==='hiring')return {icon:'job',title:event.title};
 if(event.review)return {icon:'compass',title:'The opportunity ahead'};
 if(event.kind==='forecast'||event.kind==='outlook')return {icon:'compass',title:'What could happen next'};
 if(event.kind==='account'||/glassdoor|reddit|reviewer|employee account/.test(text))return {icon:'conversation',title:'Inside the employee experience'};
 if(/filled|expired|closed|unavailable|410 gone|404|redirect/.test(text))return {icon:'job',title:'Job availability update'};
 if(/intern|student|graduate|university|master|bachelor/.test(text))return {icon:'graduate',title:'Student career pathways'};
 if(/hackathon|datathon|competition|event|conference/.test(text))return {icon:'calendar',title:'Events and opportunities'};
 if(/acquisition|acquire|supplier|partnership/.test(text))return {icon:'partnership',title:'New partnerships and business growth'};
 if(/funding|investment|million|billion|capital raise/.test(text))return {icon:'funding',title:'Investment and growth plans'};
 if(/layoff|cuts|loss|efficiency|restructur/.test(text))return {icon:'shield',title:'Changes that could affect hiring'};
 if(/campus|facility|facilities|office|expansion|long beach/.test(text))return {icon:'building',title:'Expansion and workplace plans'};
 if(/logistics|warehouse|supply.chain|production|truck|manufactur/.test(text))return {icon:'logistics',title:'Operations and supply-chain opportunities'};
 if(/recruit|hiring|vacancy|job|role|analyst|manager/.test(text))return {icon:'job',title:'Roles worth exploring'};
 if(/market|customer|sales|commercial|brand/.test(text))return {icon:'target',title:'Customer and commercial opportunities'};
 return {icon:'document',title:'The latest company developments'};
}
export const extraDrawings={
 job:'<rect x="22" y="40" width="86" height="62" rx="8"/><path d="M47 40V27h36v13M22 61q43 22 86 0M57 66v15h16V66"/>',
 graduate:'<path d="m13 46 52-25 52 25-52 25zM32 57v26q33 25 66 0V57M113 49v40"/><circle cx="113" cy="95" r="5"/>',
 conversation:'<path d="M18 25h70v49H44L26 90V74h-8zM88 44h24v53H98l-1 15-23-15H53V82M32 42h42M32 55h30"/>',
 partnership:'<path d="m15 47 23-17 24 9 23-7 30 20-15 22-19 20-14 8-17-7-22-22zM39 33 25 68M88 35l16 36M61 40 47 56q6 14 18 0l26 23M42 79l17 16M52 69l21 23"/>',
 funding:'<ellipse cx="44" cy="81" rx="25" ry="10"/><path d="M19 81v16c0 14 50 14 50 0V81M23 59l23-19 22 7 35-27m-22 0h22v22"/><circle cx="93" cy="83" r="22"/><path d="M93 69v28m8-22c-23-10-24 19 0 11-1 12-17 10-20 4"/>',
 shield:'<path d="m65 19 38 14v28c0 26-38 47-38 47S27 87 27 61V33zM65 40v30"/><circle cx="65" cy="84" r="2"/>',
 logistics:'<path d="M16 45h61v48H16zM77 59h22l16 18v16H77M91 61v17h22M28 45V29h35v16M29 61h34M44 61v19"/><circle cx="35" cy="96" r="10"/><circle cx="96" cy="96" r="10"/>',
 target:'<circle cx="63" cy="66" r="39"/><circle cx="63" cy="66" r="24"/><circle cx="63" cy="66" r="8"/><path d="m65 64 38-38M103 26V14l12 1v12z"/>',
 document:'<path d="M29 16h50l23 23v71H29zM79 16v25h23M43 55h44M43 69h44M43 83h29M43 97h19"/>'
};
