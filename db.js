import Database from "better-sqlite3";
const db=new Database("bot.db")        
db.prepare(`create table if not exists users(      //creation of the db svhema
    chat_id integer primary key )`).run()
db.prepare(`create table if not exists repos(
    url text primary key,
    name text,
    last_tag text,
    last_checked integer
    )`).run()
db.prepare(`create table if not exists watches(
    chat_id integer references users(chat_id),
    url text references repos(url),
    primary key (chat_id,url)
    )`).run()
export default db;

// adding a user

export function addUser(chat_id){
const query=db.prepare(`insert or ignore into users()
    values (?)`)
query.run(chat_id)
} 

//adding a repo

export function addRepo(url,name,last_tag,last_checked){
const query=db.prepare(`insert or ignore into repos()
    values(?,?,?,?)`)
query.run(url,name,last_tag,last_checked)
} 

//adding a watch

export function addWatch(chat_id,url){
const query=db.prepare(`ìnsert or ignore into watches()
  values(?,?) `)
  query.run(chat_id,url)
}

//removing a watch

export function removeWatch(chat_id,url){
const query=db.prepare(`delete from watches
     where chat_id=? and url=?`)
query.run(chat_id,url)
const res=db.prepare(`select * from repos 
    where url=?`).run(url)
if(!res){
db.prepare(`delete from repos
     where url=?`).run(url)
}
}


//updating a repo

export function updateRepo(name,url,last_tag){
const query=db.prepare(`update repos set name=? last_tag=? where url=?`)
query.run(name,url,last_tag)
}

//getting the list of watches for a user
 export function getWatchedById(chat_id){
const query=db.prepare(`select repos.name,repos.last_tag
from watches join repos on watches.url = repos.url
where watches.chat_id = ?
order by repos.name asc`)
return query.all(chat_id)
}


//getting the list of watches 

export function getAllWatchedRepos(){
const query=db.prepare(`select repos.name,repos.url,repos.last_tag,
GROUP_CONCAT(watches.chat_id) as chat_ids from repos
join watches on repos.url = watches.url group by repos.url;`)
return query.all();
}