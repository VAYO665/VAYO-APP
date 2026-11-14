
(function(){

"use strict";

const db = window.vayo;

let version = 0;

let channel = null;

let userId = null;

let queue = Promise.resolve();

const services = [

 "marketplace",

 "taxi",

 "food",

 "courier"

];

const style = document.createElement("style");

style.textContent = `

.vayo-chat-button{

 display:inline-flex;

 align-items:center;

 justify-content:center;

 gap:7px;

 background:#ff6500;

 color:white;

 border:0;

 border-radius:12px;

 padding:12px 16px;

 font-weight:bold;

 cursor:pointer;

 text-decoration:none;

}

.vayo-chat-float{

 position:fixed;

 right:18px;

 bottom:90px;

 width:57px;

 height:57px;

 border-radius:50%;

 background:#ff6500;

 color:white;

 display:flex;

 align-items:center;

 justify-content:center;

 font-size:27px;

 box-shadow:0 4px 18px #0003;

 z-index:100;

 text-decoration:none;

}

.vayo-chat-count{

 position:absolute;

 top:-5px;

 right:-4px;

 background:#dc2626;

 color:white;

 border:2px solid white;

 border-radius:20px;

 padding:3px 6px;

 font-size:11px;

 font-weight:bold;

}

`;

document.head.appendChild(style);

function validUUID(id){

 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");

}

window.openVayoChat = async function(service,id){

 if(!services.includes(service) || !validUUID(id)){

 alert("Суҳбат дастрас нест.");

 return;

 }

 if(!db){

 alert("Supabase дастрас нест.");

 return;

 }

 try{

 const {data,error} = await db.auth.getUser();

 if(error || !data?.user){

 location.href = "./account.html";

 return;

 }

 const {data:chatId,error:chatError} =

 await db.rpc("vayo_open_chat",{

 p_service:service,

 p_reference_id:id

 });

 if(chatError) throw chatError;

 if(!validUUID(chatId)){

 throw new Error("Chat unavailable");

 }

 location.href = "./chat.html?id="+

 encodeURIComponent(chatId);

 }catch(error){

 alert(error.message);

 }

};

window.vayoChatButton = function(service,id){

 if(!services.includes(service) || !validUUID(id)){

 return "";

 }

 return `

 <button type="button"

 class="vayo-chat-button"

 data-vayo-service="${service}"

 data-vayo-reference="${id}">

 💬 Паём нависед

 </button>

 `;

};

document.addEventListener("click",event=>{

 const button = event.target.closest(

 "[data-vayo-service][data-vayo-reference]"

 );

 if(!button) return;

 event.preventDefault();

 if(button.disabled) return;

 button.disabled = true;

 window.openVayoChat(

 button.dataset.vayoService,

 button.dataset.vayoReference

 ).finally(()=>{

 button.disabled = false;

 });

});

function createFloatingButton(){

 if(document.getElementById("vayoChatFloat")) return;

 const link = document.createElement("a");

 link.id = "vayoChatFloat";

 link.href = "./chat.html";

 link.className = "vayo-chat-float";

 link.setAttribute("aria-label","Паёмҳои VAYO");

 link.style.display = "none";

 link.innerHTML = `

 💬

 <span id="vayoChatCount"

 class="vayo-chat-count"

 style="display:none">

 0

 </span>

 `;

 document.body.appendChild(link);

}

async function updateCount(){

 if(!db) return;

 const current = ++version;

 const button = document.getElementById("vayoChatFloat");

 const badge = document.getElementById("vayoChatCount");

 if(!button || !badge) return;

 try{

 const {data,error} = await db.auth.getSession();

 if(current!==version) return;

 if(error) throw error;

 if(!data.session){

 button.style.display = "none";

 badge.style.display = "none";

 return;

 }

 button.style.display = "flex";

 const result = await db.rpc("vayo_unread_messages");

 if(current!==version) return;

 if(result.error) throw result.error;

 const count = Number(result.data || 0);

 badge.textContent = count>99?"99+":count;

 badge.style.display = count>0?"block":"none";

 }catch(error){

 if(current===version){

 badge.style.display = "none";

 }

 console.error("VAYO Chat:",error.message);

 }

}

function connectRealtime(){

 queue = queue.catch(console.error).then(async()=>{

 if(!db) return;

 const {data} = await db.auth.getSession();

 const id = data?.session?.user?.id || null;

 if(channel && userId===id) return;

 if(channel){

 await db.removeChannel(channel);

 channel = null;

 }

 userId = id;

 if(!id) return;

 channel = db.channel("vayo-chat-global-"+id)

 .on("postgres_changes",{

 event:"*",

 schema:"public",

 table:"chat_conversations",

 filter:"participant_one=eq."+id

 },updateCount)

 .on("postgres_changes",{

 event:"*",

 schema:"public",

 table:"chat_conversations",

 filter:"participant_two=eq."+id

 },updateCount)

 .subscribe();

 });

 return queue;

}

function start(){

 if(!db) return;

 createFloatingButton();

 updateCount();

 connectRealtime();

 db.auth.onAuthStateChange(event=>{

 if(event==="SIGNED_OUT"){

 version++;

 const button = document.getElementById("vayoChatFloat");

 if(button) button.style.display = "none";

 }

 setTimeout(()=>{

 updateCount();

 connectRealtime();

 },0);

 });

 setInterval(()=>{

 if(document.visibilityState==="visible"){

 updateCount();

 }

 },15000);

 document.addEventListener("visibilitychange",()=>{

 if(document.visibilityState==="visible"){

 updateCount();

 }

 });

}

if(document.readyState==="loading"){

 document.addEventListener("DOMContentLoaded",start);

}else{

 start();

}

})();
