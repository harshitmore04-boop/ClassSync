export const normalizeRoll=value=>String(value??'').trim().toUpperCase();
export function validateRosterRows(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>500)throw Error('Upload 1–500 students at a time.');
 const seen=new Set();return rows.map((r,i)=>{const roll=normalizeRoll(r.roll),name=String(r.name??'').trim().replace(/\s+/g,' '),email=String(r.email??'').trim().toLowerCase();
 if(!/^[A-Z0-9][A-Z0-9._/-]{0,29}$/.test(roll))throw Error('Row '+(i+1)+': use a valid roll number (letters, numbers, . _ / -).');
 if(seen.has(roll))throw Error('Duplicate roll number: '+roll);seen.add(roll);
 if(name.length>60||/[\x00-\x1f]/.test(name))throw Error('Row '+(i+1)+': name must be at most 60 characters.');
 if(email&&(email.length>150||!/^\S+@\S+\.\S+$/.test(email)||email.endsWith('@roster.invalid')))throw Error('Row '+(i+1)+': invalid email.');
 return {roll,name,email};});
}
export function parseRoster(text){
 text=String(text).replace(/^\uFEFF/,'');if(text.length>150000)throw Error('File is too large. Use a list under 150 KB.');
 const separator=text.includes('\t')?'\t':',',records=[];let cells=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted||!cell)quoted=!quoted;else throw Error('Invalid CSV quote.');}
 else if(c===separator&&!quoted){cells.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;cells.push(cell);if(cells.some(x=>x.trim()))records.push(cells);cells=[];cell=''}else cell+=c;}
 if(quoted)throw Error('CSV has an unclosed quote.');cells.push(cell);if(cells.some(x=>x.trim()))records.push(cells);
 if(!records.length)throw Error('The file is empty.');const key=s=>s.trim().toLowerCase().replace(/[^a-z0-9]/g,''),rollHeaders=['roll','rollno','rollnumber','usn','studentid'],head=records[0].map(key),hasHeader=head.some(x=>rollHeaders.includes(x));
 let ri=0,ni=1,ei=2;if(hasHeader){ri=head.findIndex(x=>rollHeaders.includes(x));ni=head.findIndex(x=>['name','fullname','studentname'].includes(x));ei=head.findIndex(x=>['email','emailaddress','studentemail'].includes(x));records.shift();}
 return validateRosterRows(records.map((r,i)=>{if(r.length>(hasHeader?head.length:3))throw Error('Row '+(i+1)+': unexpected columns. Use roll,name,email or one roll per line.');return {roll:r[ri],name:ni>=0?r[ni]:'',email:ei>=0?r[ei]:''};}));
}

// PDF rows arrive in reading order; text extraction is kept separate from registration.
export function parsePdfRosterLines(lines){
 const rows=[],skipped=[];
 for(const original of lines){const line=original.trim().replace(/\s+/g,' ');if(!line)continue;
 if(/^(page\s*\d+|s\.?\s*no\.?|serial|roll\s*(no\.?|number)?\s*(name|student)|usn\s*(name|student)|name\s*(roll|usn)|student\s*name\s*(roll|usn))/i.test(line))continue;
 const words=line.split(' '),strong=words.map((w,i)=>({w,i})).filter(({w})=>/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9._/-]{2,30}$/.test(w));
 let candidate=strong[0];if(strong.length>1){skipped.push(line);continue;}
 if(!candidate){const numeric=words.map((w,i)=>({w,i})).filter(({w})=>/^\d{1,30}$/.test(w));candidate=numeric.find(({w})=>w.length>=3)||numeric[0];}
 if(!candidate){skipped.push(line);continue;}
 let parts=words.filter((_,i)=>i!==candidate.i);if(parts.length&&/^\d+[.)]?$/.test(parts[0]))parts.shift();const email=parts.find(w=>/^\S+@\S+\.\S+$/.test(w))||'';parts=parts.filter(w=>w!==email);
 const name=parts.join(' ').trim();if(name&&(/\d/.test(name)||/^(total|students|class|semester|section|date)\b/i.test(name))){skipped.push(line);continue;}
 rows.push({roll:candidate.w,name,email});
 }
 if(!rows.length)throw Error('No readable student rows found. Use a text-based PDF with one roll and optional name per line, or register manually. Scanned images need OCR first.');
 return {rows:validateRosterRows(rows),skipped};
}
