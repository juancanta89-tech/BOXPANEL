// Generates SQL for an explicitly verified owner subject. Never runs remote SQL.
const subject=process.argv[2];
if(!subject||subject.length>256||/[\x00-\x1f]/.test(subject))throw Error('Uso: node scripts/owner-sql.mjs <sub-verificado>');
console.log("INSERT INTO bp_panel_accounts(id,access_identity,role,reseller_id) VALUES ('"+crypto.randomUUID()+"','"+subject.replaceAll("'","''")+"','super_admin',NULL);");
