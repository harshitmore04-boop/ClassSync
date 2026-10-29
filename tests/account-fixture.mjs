import crypto from 'node:crypto';
// Attendance tests seed authenticated classroom members directly. OTP behavior
// is exercised separately against the real auth route in email-verification.test.
export function seedSession(app,{email,role,name=role}){
 let account=app.sql.prepare('SELECT id FROM accounts WHERE email=?').get(email);
 if(!account){
  account={id:crypto.randomUUID()};
  app.sql.prepare('INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,teacher_slot,created) VALUES (?,?,?,?,?,?,?,?,?)').run(account.id,email,name,role,crypto.randomBytes(32).toString('hex'),'fixture',100000,role==='teacher'?'classroom':null,Date.now());
  if(role==='teacher')app.sql.prepare("INSERT INTO workspace (id,owner) VALUES ('classroom',?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner").run(account.id);
 }
 const token=crypto.randomBytes(32).toString('hex');
 app.sql.prepare('INSERT INTO account_sessions (token_hash,account_id,expires) VALUES (?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),account.id,Date.now()+604800000);
 return 'classsync_session='+token;
}
