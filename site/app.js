(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const activityNames = {run:'跑步',walk:'散步 / 快走',strength:'健身 / 力量训练',ball:'球类运动',home:'居家活动',rest:'休息与放松'};
  const icons = {run:'↗',walk:'⌁',strength:'✳',ball:'◉',home:'⌂',rest:'☾'};
  const storageKey = 'budiao-campus-motion-v1';
  let stored = safeRead();
  let history = stored.history || [];
  let currentPlan = null;
  let mode = 'recommend';
  let activity = 'run';
  let watchId = null;
  let timerId = null;
  let startedAt = 0;
  let elapsedSeconds = 0;
  let lastPoint = null;
  let distanceMeters = 0;
  let lastSpeechAt = 0;

  function safeRead(){ try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{return {}} }
  function save(){ localStorage.setItem(storageKey, JSON.stringify({history, lastPlan:currentPlan})); }
  function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),2400)}
  function fmtTime(seconds){const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function paceText(meters, seconds){if(meters<100||seconds<10)return '--:--';const p=seconds/(meters/1000);if(!Number.isFinite(p)||p>1800)return '--:--';return `${String(Math.floor(p/60)).padStart(2,'0')}:${String(Math.round(p%60)).padStart(2,'0')}`}
  function showTab(name){$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));window.scrollTo({top:0,behavior:'smooth'});if(name==='history')renderHistory()}
  $$('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  $$('.choice').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;$$('.choice').forEach(x=>x.classList.toggle('active',x===b));$('#activity-picker').classList.toggle('hidden',mode!=='choose')}));
  $$('.activity-option').forEach(b=>b.addEventListener('click',()=>{activity=b.dataset.activity;$$('.activity-option').forEach(x=>x.classList.toggle('selected',x===b))}));

  function chooseActivity(){
    const energy=$('#energy').value, soreness=$('#soreness').value, pref=$('#preference').value, mood=$('#mood').value;
    if(soreness==='yes'||energy==='low')return 'rest';
    if(mode==='choose')return activity;
    if(mood==='social'&&pref==='any')return 'ball';
    if(pref!=='any')return pref;
    if(energy==='high'&&$('#recent').value==='regular')return 'run';
    if($('#recent').value==='little')return 'walk';
    return 'home';
  }
  async function makePlan(){
    const selected=chooseActivity(), mins=Number($('#minutes').value),recent=$('#recent').value,energy=$('#energy').value,soreness=$('#soreness').value,mood=$('#mood').value,pref=$('#preference').value;
    const cap=Math.max(10,mins-8);let mainDuration=Math.max(6,cap-5);let intensity='轻松';
    if(recent==='little'||energy==='low'||soreness==='mild')mainDuration=Math.min(mainDuration,18);
    if(recent==='regular'&&energy==='high'&&soreness==='no'&&mood==='steady'){mainDuration=Math.min(cap,mainDuration+4);intensity='舒适偏稳';}
    if(selected==='rest')mainDuration=0;
    const all={
      run:{name:'跑步',prep:'先走 4–5 分钟，再做轻松的动态活动。',main:`用能轻松说话的感觉慢跑约 ${mainDuration} 分钟；状态下降就改走路。`,cool:'结束后慢走 3–5 分钟，让呼吸慢慢平稳。',cue:'不追配速，呼吸顺畅优先。',stretch:['小腿轻柔拉伸','大腿前侧拉伸','臀部轻柔拉伸'],why:'以轻松、可持续为主。配速和距离受路线、天气及 GPS 影响，先以主观舒适度调整。'},
      walk:{name:'散步 / 快走',prep:'从轻松步行开始，逐渐走到舒服的步速。',main:`按舒适步速走约 ${mainDuration} 分钟，可以选择校园里熟悉、安全的路线。`,cool:'最后 3 分钟慢下来，做几次自然深呼吸。',cue:'能自然聊天就是合适的节奏。',stretch:['小腿轻柔拉伸','大腿后侧轻柔拉伸','肩颈放松'],why:'低门槛开始，先让今天的活动容易完成。'},
      strength:{name:'健身 / 力量训练',prep:'做几分钟轻松热身，再用很轻的负荷熟悉动作。',main:`选择 2–3 个熟悉动作，轻到中等强度练约 ${mainDuration} 分钟；动作不稳或有不适时停止加量。`,cool:'放下器械后慢走一会儿，轻柔活动刚才练到的部位。',cue:'动作控制和舒适度优先，不需要练到力竭。',stretch:['胸肩轻柔拉伸','髋部活动','大腿与小腿放松'],why:'今天的状态和经验优先于“必须加重量”。初版不能识别动作视频，不会声称能判断动作标准。'},
      ball:{name:'球类活动',prep:'轻松走动和动态活动身体，先从低强度开始。',main:`和朋友进行约 ${mainDuration} 分钟的轻松活动，累了就轮换或休息。`,cool:'慢走几分钟，补充饮水，等身体平稳后再离开。',cue:'社交和愉快感也算运动体验的一部分。',stretch:['小腿轻柔拉伸','大腿前侧拉伸','肩部放松'],why:'以能持续参与为目标，不把每次活动都变成强度挑战。'},
      home:{name:'居家活动',prep:'腾出安全空间，轻松走动并活动关节。',main:`做约 ${mainDuration} 分钟的舒适活动：原地走、轻柔徒手动作或跟随熟悉的视频。`,cool:'放慢动作，轻柔活动身体，做几次自然呼吸。',cue:'不需要器械，也不需要一次做很多。',stretch:['肩颈放松','髋部轻柔活动','小腿轻柔拉伸'],why:'按可用空间和时间安排，今天完成一点就很好。'},
      rest:{name:'休息与放松',prep:'今天不安排训练。',main:'如果舒服，可以散步几分钟或做轻柔的日常活动；明显不适时就休息。',cool:'给自己留出恢复时间，等状态好些再运动。',cue:'休息也是计划的一部分。',stretch:['自然呼吸','舒适姿势放松','不做会引起疼痛的动作'],why:soreness==='yes'?'你反馈有明显不适，今天不建议按计划训练。若不适持续或加重，请寻求专业帮助。':'状态偏累时选择恢复，比勉强完成训练更合适。'}
    };
    const t=all[selected]; currentPlan={activity:selected,name:t.name,mainDuration,minutes:mins,intensity,createdAt:Date.now(),rest:selected==='rest',source:'local',...t};
    const button=$('#make-plan');button.disabled=true;button.textContent='正在整理你的安排…';
    try{
      const resp=await fetch('/api/agent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile:{recent,energy,minutes:mins,preference:pref,reportedActivity:selected,mood,soreness},recentHistory:history.slice(0,3).map(x=>({activity:x.activity,fatigue:x.fatigue,feel:x.feel,seconds:x.seconds}))})});
      if(resp.ok){const data=await resp.json();if(data.plan&&typeof data.plan==='object'){currentPlan={...currentPlan,...data.plan,activity:selected,name:t.name,mainDuration,minutes:mins,source:'model'};}}
    }catch{/* Standalone demo uses the local decision flow when no model server is configured. */}
    finally{button.disabled=false;button.innerHTML='为我安排今天 <span>→</span>'}
    renderPlan(currentPlan);$('#plan-result').scrollIntoView({behavior:'smooth',block:'start'});$('#session-title').textContent=`${currentPlan.name} · 今日安排`;save();
  }
  $('#make-plan').addEventListener('click',makePlan);

  function renderPlan(p){
    const result=$('#plan-result');result.classList.remove('hidden');
    result.innerHTML=`<div class="plan-banner"><div><p class="eyebrow">${p.source==='model'?'AI-ASSISTED PLAN':'LOCAL DEMO PLAN'} · ${p.source==='model'?'模型已连接':'本地规则演示，未连接语言模型'}</p><h3>${esc(p.name)} · ${p.rest?'给身体留一点恢复时间':'按舒服的节奏开始'}</h3><p>${esc(p.cue)}</p></div><div class="plan-badge"><b>${p.mainDuration?`${p.mainDuration}`:'0'}</b><small>${p.mainDuration?'分钟主活动':'今天休息'}</small></div></div>
      <div class="plan-cards"><article class="plan-step card"><span class="step-number">01 / PREPARE</span><h4>开始前</h4><p>${esc(p.prep)}</p></article><article class="plan-step card"><span class="step-number">02 / MOVE</span><h4>今天做什么</h4><p>${esc(p.main)}</p></article><article class="plan-step card"><span class="step-number">03 / RECOVER</span><h4>结束后</h4><p>${esc(p.cool)}</p></article></div>
      <div class="why-card card"><span class="why-icon">✦</span><span><b>为什么这样安排：</b>${esc(p.why)} 运动建议根据你本次填写的信息生成，不是医学评估。</span></div>
      <div class="result-actions"><button id="go-move" class="primary-button">进入运动中 <span>→</span></button><button id="save-plan" class="secondary-button">先保存这份计划</button></div>`;
    $('#go-move').addEventListener('click',()=>showTab('move'));
    $('#save-plan').addEventListener('click',()=>{currentPlan=p;save();toast('计划已保存在当前浏览器')});
  }

  $('#start-session').addEventListener('click',startSession);
  $('#finish-session').addEventListener('click',finishSession);
  function startSession(){
    if(startedAt)return;
    startedAt=Date.now();elapsedSeconds=0;distanceMeters=0;lastPoint=null;lastSpeechAt=0;
    $('#start-session').disabled=true;$('#finish-session').disabled=false;$('#gps-state').textContent='计时中';$('#tracker-message').textContent='运动计时已开始。保持舒服的节奏，累了可以放慢或暂停。';
    timerId=setInterval(()=>{elapsedSeconds=Math.floor((Date.now()-startedAt)/1000);$('#elapsed').textContent=fmtTime(elapsedSeconds)},1000);
    if(currentPlan?.activity==='run'||!currentPlan){
      if(!('geolocation'in navigator)){$('#tracker-message').textContent='当前浏览器不支持定位；仍可记录运动时间。';return}
      navigator.geolocation.getCurrentPosition(()=>{},err=>{$('#tracker-message').textContent=err.code===1?'未授权定位；仍可继续计时，结束后手动记录。':'GPS暂不可用；仍可继续计时，结束后手动记录。'},{enableHighAccuracy:true,timeout:7000,maximumAge:0});
      watchId=navigator.geolocation.watchPosition(onLocation,()=>{$('#gps-state').textContent='GPS 暂不可用';},{enableHighAccuracy:true,maximumAge:3000,timeout:12000});
      $('#gps-state').textContent='定位中';
    }
  }
  function onLocation(pos){
    const c=pos.coords;if(c.accuracy&&c.accuracy>45)return;
    const point={lat:c.latitude,lon:c.longitude,time:pos.timestamp};
    if(lastPoint){const d=distanceBetween(lastPoint,point),dt=(point.time-lastPoint.time)/1000;if(d>=2&&d<100&&dt>0){distanceMeters+=d;}}
    lastPoint=point;$('#distance').textContent=(distanceMeters/1000).toFixed(2);$('#pace').textContent=paceText(distanceMeters,elapsedSeconds);$('#gps-state').textContent='GPS 已连接';
    if(distanceMeters>0){$('#pace-fill').style.width=`${Math.min(100,Math.max(8,20+distanceMeters/40))}%`}
    const km=Math.floor(distanceMeters/1000);if(km>lastSpeechAt&&$('#audio-cues').checked){lastSpeechAt=km;speak(`已完成 ${km} 公里，当前平均配速约每公里 ${$('#pace').textContent.replace(':','分')} 秒。保持舒服的节奏。`)}
  }
  function distanceBetween(a,b){const r=6371000,toRad=x=>x*Math.PI/180,dl=toRad(b.lat-a.lat),dn=toRad(b.lon-a.lon),h=Math.sin(dl/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dn/2)**2;return 2*r*Math.asin(Math.sqrt(h))}
  function speak(text){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=1;window.speechSynthesis.speak(u)}
  function finishSession(){
    if(!startedAt)return;
    elapsedSeconds=Math.floor((Date.now()-startedAt)/1000);clearInterval(timerId);timerId=null;if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}if('speechSynthesis'in window)window.speechSynthesis.cancel();
    const session={startedAt,seconds:elapsedSeconds,distance:distanceMeters,activity:currentPlan?.activity||'run',plan:currentPlan};startedAt=0;
    $('#start-session').disabled=false;$('#finish-session').disabled=true;$('#gps-state').textContent='已结束';$('#tracker-message').textContent='本次运动已结束。记录你的感受后，我会帮你安排恢复和下一次。';
    showPostWorkout(session);
  }
  function showPostWorkout(session){
    const pop=document.createElement('div');pop.className='modal-backdrop';pop.innerHTML=`<div class="feedback-modal card" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><button class="modal-close" aria-label="关闭">×</button><p class="eyebrow">AFTER YOUR SESSION</p><h3 id="feedback-title">完成得很好，感觉怎么样？</h3><p class="modal-summary">${esc(activityNames[session.activity]||'运动')} · ${fmtTime(session.seconds)}${session.distance>=100?` · ${(session.distance/1000).toFixed(2)} 公里`:''}</p><label class="field-label" for="fatigue">这次运动后疲劳感</label><select id="fatigue" class="input"><option value="1">1 · 轻松</option><option value="2" selected>2 · 还不错</option><option value="3">3 · 有点累</option><option value="4">4 · 很累</option><option value="5">5 · 过于疲惫</option></select><label class="field-label modal-label" for="feel">身体感受或想补充的内容</label><textarea id="feel" class="input modal-textarea" placeholder="例如：今天状态不错 / 腿有点酸 / 下次想换成散步"></textarea><div class="recovery-preview"><b>接下来</b><span>我会按你的反馈给出拉伸、一般饮食建议和下一次运动安排。</span></div><button id="finish-save" class="primary-button">生成恢复与下次建议 <span>→</span></button></div>`;
    document.body.appendChild(pop);const close=()=>pop.remove();$('.modal-close',pop).addEventListener('click',close);pop.addEventListener('click',e=>{if(e.target===pop)close()});$('#finish-save',pop).addEventListener('click',()=>{const fatigue=Number($('#fatigue',pop).value),feel=$('#feel',pop).value.trim();const item={date:Date.now(),activity:session.activity,seconds:session.seconds,distance:session.distance,fatigue,feel,plan:session.plan};history.unshift(item);history=history.slice(0,50);save();close();showRecovery(item);renderHistory();toast('运动记录已保存到本机')});
  }
  function showRecovery(item){
    const tired=item.fatigue>=4, sore=/酸|痛|不适|扭|拉伤/.test(item.feel||'');const next=tired||sore?'下次优先休息或轻松散步，等状态恢复后再安排训练。':item.fatigue===3?'下次先维持轻松强度，观察身体感受后再决定是否增加。':'下次可以重复今天的舒服节奏；先稳定坚持，再考虑逐步调整。';
    const stretch=item.plan?.stretch||['小腿轻柔拉伸','大腿轻柔拉伸','肩颈放松'];
    const food='饮食建议保持一般性：按平时习惯安排一餐，注意饮水并搭配日常食物；无需因一次运动进行极端补偿或限制。';
    const box=document.createElement('div');box.className='modal-backdrop';box.innerHTML=`<div class="feedback-modal recovery-modal card" role="dialog" aria-modal="true"><button class="modal-close" aria-label="关闭">×</button><p class="eyebrow">RECOVERY & NEXT STEP</p><h3>让今天的运动，接上下一次。</h3><div class="recovery-block"><span class="recovery-num">01</span><div><b>轻柔放松 · 每个动作约 20 秒</b><div class="stretch-list">${stretch.map((x,i)=>`<div class="stretch-row"><span>${i+1}. ${esc(x)}</span><button class="timer-button" data-timer="20">开始计时</button></div>`).join('')}</div><small>有疼痛或明显不适时不要勉强拉伸。</small></div></div><div class="recovery-block"><span class="recovery-num">02</span><div><b>饮食和饮水</b><p>${food}</p></div></div><div class="recovery-block"><span class="recovery-num">03</span><div><b>下一次怎么安排</b><p>${next}</p></div></div><button class="primary-button recovery-done">保存并查看记录 <span>→</span></button></div>`;
    document.body.appendChild(box);$('.modal-close',box).addEventListener('click',()=>box.remove());box.addEventListener('click',e=>{if(e.target===box)box.remove()});$$('.timer-button',box).forEach(btn=>btn.addEventListener('click',()=>runStretchTimer(btn)));$('.recovery-done',box).addEventListener('click',()=>{box.remove();showTab('history')});
  }
  function runStretchTimer(btn){let left=Number(btn.dataset.timer);btn.disabled=true;btn.textContent=`${left} 秒`;const interval=setInterval(()=>{left--;btn.textContent=left>0?`${left} 秒`:'完成';if(left<=0){clearInterval(interval);setTimeout(()=>{btn.disabled=false;btn.textContent='再计时'},900)}},1000)}

  function renderHistory(){
    $('#history-count').textContent=history.length;$('#total-sessions').innerHTML=`${history.length} <small>次</small>`;
    $('#last-activity').textContent=history[0]?`${activityNames[history[0].activity]||'运动'} · ${new Date(history[0].date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}`:'还没有记录';
    $('#history-next').textContent=history.length?nextRecommendation(history[0]):'先安排今天的活动';
    $('#clear-history').classList.toggle('hidden',!history.length);
    const list=$('#history-list');if(!history.length){list.innerHTML='<div class="empty-state"><b>每一次运动都值得记录</b>完成一次活动后，你的记录会出现在这里。它只保存在这台设备的浏览器中。</div>';return}
    list.innerHTML=history.map(item=>`<article class="history-item"><div class="history-item-main"><span class="history-symbol">${icons[item.activity]||'✦'}</span><div><b>${esc(activityNames[item.activity]||'运动')}</b><small>${new Date(item.date).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 疲劳感 ${item.fatigue}/5${item.distance>=100?` · ${(item.distance/1000).toFixed(2)} km`:''}</small></div></div><span class="history-duration">${fmtTime(item.seconds)}</span></article>`).join('');
  }
  function nextRecommendation(item){if(item.fatigue>=4||/酸|痛|不适|扭|拉伤/.test(item.feel||''))return '先恢复，再轻松开始';if(item.fatigue===3)return '维持强度，观察状态';return '重复舒服的节奏';}
  $('#clear-history').addEventListener('click',()=>{if(confirm('确定清除保存在此浏览器的运动记录吗？')){history=[];save();renderHistory();toast('本机记录已清除')}});

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  renderHistory();
})();
