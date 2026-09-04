const TOTAL_QUESTIONS=20;
const SPECIES_API="https://pokeapi.co/api/v2/pokemon-species/";
const ARTWORK=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

// PokeAPI 기준 1~1025번 전체 포켓몬을 출제 풀로 사용합니다.
const ALL_IDS=Array.from({length:1025},(_,i)=>i+1);
let questions=[],index=0,score=0,correct=0,locked=false,listening=false,recognition=null;

const $=id=>document.getElementById(id);
const screens=[$("startScreen"),$("gameScreen"),$("resultScreen")];

function shuffle(a){
  const x=[...a];
  for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}
  return x;
}
function newGameQuestions(){return shuffle(ALL_IDS).slice(0,TOTAL_QUESTIONS)}
function screen(s){screens.forEach(x=>x.classList.remove("active"));s.classList.add("active")}
function header(){
  $("progressText").textContent=`${index+1} / ${TOTAL_QUESTIONS}`;
  $("score").textContent=score;
  $("progressBar").style.width=`${(index+1)/TOTAL_QUESTIONS*100}%`;
}
async function koreanName(id){
  try{
    const r=await fetch(SPECIES_API+id);
    const d=await r.json();
    return d.names?.find(n=>n.language?.name==="ko")?.name||d.name;
  }catch(e){return `포켓몬 ${id}`}
}
async function showQuestion(){
  locked=false;
  header();
  $("heardText").textContent="";
  $("resultText").textContent="";
  $("retryBtn").classList.add("hidden");
  $("micBtn").classList.remove("hidden");
  $("nextBtn").classList.remove("hidden");
  $("micStatus").textContent="마이크를 누르고 포켓몬 이름을 말해보세요!";
  const item=questions[index];
  $("loading").style.display="block";
  $("pokemonImage").style.display="none";
  $("pokemonImage").src=ARTWORK(item.id);
  $("pokemonImage").onload=()=>{$("loading").style.display="none";$("pokemonImage").style.display="block"};
  item.name=await koreanName(item.id);
}
function clean(s){
  return String(s).toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu,"")
    .replace(/(입니다|이에요|예요|이야|야|요)$/u,"");
}
function correctAnswer(answer,target){
  const a=clean(answer),t=clean(target);
  return !!a&&(a===t||(a.includes(t)&&a.length<=t.length+5));
}
function setupRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){$("micBtn").disabled=true;$("micStatus").textContent="Chrome 또는 Edge에서 음성인식을 사용할 수 있어요.";return null}
  const r=new SR();
  r.lang="ko-KR";r.continuous=false;r.interimResults=false;r.maxAlternatives=3;
  r.onstart=()=>{listening=true;$("micBtn").classList.add("listening");$("micStatus").textContent="🎤 듣고 있어요! 포켓몬 이름을 말해주세요!"};
  r.onresult=e=>{
    const arr=Array.from(e.results[0]||[]).map(v=>v[0]?.transcript||"");
    $("heardText").textContent=`🗣️ "${arr[0]||""}"`;
    if(arr.some(v=>correctAnswer(v,questions[index].name))) good(); else bad();
  };
  r.onerror=e=>{
    if(e.error==="not-allowed"||e.error==="service-not-allowed") $("micStatus").textContent="🎤 마이크 권한을 허용해주세요!";
    else if(e.error==="no-speech") $("micStatus").textContent="목소리가 잘 안 들렸어요. 다시 눌러보세요! 😊";
    else $("micStatus").textContent="음성인식에 문제가 생겼어요. 다시 한번 해보세요.";
  };
  r.onend=()=>{listening=false;$("micBtn").classList.remove("listening")};
  return r;
}
function listen(){
  if(locked||listening)return;
  if(!recognition)recognition=setupRecognition();
  if(!recognition)return;
  try{recognition.start()}catch(e){}
}
function good(){
  if(locked)return;locked=true;correct++;score+=10;
  $("score").textContent=score;$("resultText").textContent="🎉 정답이에요! +10점";
  $("resultText").style.transform="scale(1.06)";$("micBtn").classList.add("hidden");
  $("retryBtn").classList.add("hidden");$("micStatus").textContent="정말 잘했어요! ⭐";
  setTimeout(next,1300);
}
function bad(){
  if(locked)return;
  $("resultText").textContent="😊 아쉬워요! 다시 해볼까요?";
  $("retryBtn").classList.remove("hidden");
  $("micStatus").textContent="다시 말하거나 다음 문제로 넘어가도 좋아요!";
}
function next(){
  if(index===TOTAL_QUESTIONS-1){finish();return}
  index++;showQuestion();
}
function skip(){if(!locked)next()}
function finish(){
  if(recognition&&listening)try{recognition.stop()}catch(e){}
  $("finalScore").textContent=score;
  $("finalStats").textContent=`20문제 중 ${correct}문제를 맞혔어요!`;
  $("finalMessage").textContent=score===200?"🏆 포켓몬 박사님! 완벽해요!":score>=160?"🌟 정말 잘했어요!":score>=120?"👏 아주 잘했어요!":score>=80?"😊 잘했어요!":"💪 다시 한번 도전해봐요!";
  screen($("resultScreen"));
}
function start(){
  score=0;correct=0;index=0;
  // 매 게임마다 전체 풀을 새로 섞어 20마리를 추출합니다.
  questions=newGameQuestions().map(id=>({id,name:""}));
  screen($("gameScreen"));showQuestion();
}
$("startBtn").onclick=start;$("restartBtn").onclick=start;$("micBtn").onclick=listen;$("retryBtn").onclick=listen;$("nextBtn").onclick=skip;
$("homeBtn").onclick=()=>{if(confirm("게임을 처음 화면으로 돌아갈까요?"))screen($("startScreen"))};
recognition=setupRecognition();
