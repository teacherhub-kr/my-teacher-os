#!/usr/bin/env python3
"""Build verified locally hosted classroom media. Do not publish incomplete outputs."""
import html, json, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request, zipfile
from pathlib import Path
from PIL import Image
from io import BytesIO

ROOT=Path("lessons/orchestra-timbre")
MEDIA=ROOT/"assets"
MEDIA.mkdir(exist_ok=True)
UA="MusicClassroom/1.0 (teacherhub-kr; classroom educational resource; https://github.com/teacherhub-kr/my-teacher-os)"
TITLES={
"violin":"Violin","viola":"Viola","cello":"Cello","bass":"Double bass",
"flute":"Flute","oboe":"Oboe","clarinet":"Clarinet","bassoon":"Bassoon",
"horn":"French horn","trumpet":"Trumpet","trombone":"Trombone","tuba":"Tuba",
"timpani":"Timpani","snare":"Snare drum"}
MIRROR="https://raw.githubusercontent.com/skratchdot/philharmonia-samples/gh-pages/audio/"
SAMPLE={
"cello":("cello","cello_A2_15_forte_arco-normal.mp3"),
"bass":("double bass","double-bass_A1_15_mezzo-forte_arco-normal.mp3"),
"flute":("flute","flute_A4_phrase_mezzo-forte_normal.mp3"),
"oboe":("oboe","oboe_A4_15_forte_normal.mp3"),
"clarinet":("clarinet","clarinet_A3_15_forte_normal.mp3"),
"bassoon":("bassoon","bassoon_A2_15_forte_normal.mp3"),
"horn":("french horn","french-horn_A2_15_mezzo-forte_normal.mp3"),
"trombone":("trombone","trombone_A2_15_mezzo-forte_normal.mp3")}
COMMONS={
"violin":"Violin open string.ogg",
"viola":"Viola CGDA.ogg",
"trumpet":"Flaggenparade der deutschen Bundeswehr, Trompetensignal (Studio).ogg",
"snare":"Snare drum unmuffled.ogg"}
PERCUSSION="https://philharmonia-assets.s3-eu-west-1.amazonaws.com/uploads/2020/02/12112005/Percussion.zip"
TUBA="8 Days of Day- Tuba solo featuring Chief Musician James Hicks.webm"
CREDIT_BASE="https://commons.wikimedia.org/wiki/File:"
def retrieve(url,limit=30_000_000,tries=3):
  last=None
  for attempt in range(tries):
    try:
      req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"*/*"})
      with urllib.request.urlopen(req,timeout=38) as resp:
        size=int(resp.headers.get("Content-Length") or 0)
        if size>limit: raise RuntimeError("size exceeds max: "+str(size)+" url="+url)
        b=resp.read(limit+1)
        if len(b)>limit: raise RuntimeError("download too large: "+url)
        if len(b)<80: raise RuntimeError("too small: "+url)
        return b
    except Exception as e:
      last=e
      print("WARN",str(e)[:230],flush=True)
      time.sleep(1+attempt)
  raise RuntimeError("failed download "+url+": "+str(last))

def commons_url(name):
  return "https://commons.wikimedia.org/wiki/Special:FilePath/"+urllib.parse.quote(name)

def wiki_image(key):
  title=TITLES[key]
  q=urllib.parse.urlencode({"action":"query","prop":"pageimages","titles":title,"pithumbsize":"1200","format":"json"})
  urls=["https://en.wikipedia.org/w/api.php?"+q,
        "https://en.wikipedia.org/api/rest_v1/page/summary/"+urllib.parse.quote(title.replace(" ","_"))]
  links=[]
  for u in urls:
    try:
      data=json.loads(retrieve(u,limit=1_500_000).decode("utf-8"))
      pages=data.get("query",{}).get("pages",{}).values()
      url=next((p.get("thumbnail",{}).get("source") for p in pages if p.get("thumbnail")),None)
      url=url or data.get("thumbnail",{}).get("source")
      if url: links.append(url)
    except Exception as e:print("WARN image API",title,str(e)[:150])
  # Existing source photos are considered only to diagnose broken URLs, not republished.
  if not links: raise RuntimeError("No licensed Wikipedia photograph for "+key)
  for u in links:
    try:
      b=retrieve(u,limit=10_000_000)
      pic=Image.open(BytesIO(b));pic.verify()
      pic=Image.open(BytesIO(b))
      if min(pic.size)<350: raise ValueError("low resolution "+str(pic.size))
      pic.thumbnail((1500,1150))
      pic.convert("RGB").save(MEDIA/(key+".jpg"),"JPEG",quality=88,optimize=True)
      print("IMAGE",key,pic.size,flush=True)
      return {"url":str(MEDIA/(key+".jpg")).replace("lessons/orchestra-timbre/",""),
              "credit":f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ','_'))}"}
    except Exception as e: print("WARN image fallback",key,str(e)[:120])
  raise RuntimeError("No usable high resolution image "+key)

def save_audio(key,content,fmt,source):
  if fmt=="ogg" and content[:4]!=b"OggS": raise RuntimeError("not OGG "+key)
  if fmt=="mp3" and not (content[:3]==b"ID3" or content[:1]==b"\xff"):
    raise RuntimeError("not MP3 "+key)
  if len(content)<2000: raise RuntimeError("audio too short "+key)
  loc=MEDIA/(key+"."+fmt)
  loc.write_bytes(content)
  print("AUDIO",key,len(content),flush=True)
  return {"url":"assets/"+loc.name,"source":source,"format":fmt}

def get_audio(key):
  if key in SAMPLE:
    folder,name=SAMPLE[key]
    url=MIRROR+urllib.parse.quote(folder)+"/"+name
    try: return save_audio(key,retrieve(url),"mp3","https://philharmonia.co.uk/resources/sound-samples/")
    except Exception as e:
      print("WARN mirror audio",key,str(e),flush=True)
      # select verified original note by API list if a particular sample name differs
      api="https://api.github.com/repos/skratchdot/philharmonia-samples/contents/audio/"+urllib.parse.quote(folder)+"?ref=gh-pages"
      files=json.loads(retrieve(api,limit=1_500_000).decode())
      matches=[x for x in files if x.get("name","").endswith(".mp3") and
               ("_15_" in x["name"] or "_phrase_" in x["name"])]
      if not matches: raise RuntimeError("No playable sample in Github mirror: "+key)
      matches.sort(key=lambda x:x["size"],reverse=True)
      src=matches[0]["download_url"]
      return save_audio(key,retrieve(src),"mp3","https://philharmonia.co.uk/resources/sound-samples/")
  if key in COMMONS:
    filename=COMMONS[key]
    return save_audio(key,retrieve(commons_url(filename)),"ogg",CREDIT_BASE+urllib.parse.quote(filename))
  if key=="tuba":
    source=commons_url(TUBA)
    data=retrieve(source,limit=25_000_000)
    if data[:4]!=b"\x1a\x45\xdf\xa3": raise RuntimeError("invalid WEBM tuba")
    return save_audio(key,data,"webm",CREDIT_BASE+urllib.parse.quote(TUBA))
  if key=="timpani":
    # Only the actual timpani recordings within Philharmonia's percussion library.
    archive=retrieve(PERCUSSION,limit=350_000_000)
    with zipfile.ZipFile(BytesIO(archive)) as z:
      choices=[x for x in z.infolist() if not x.is_dir() and x.filename.lower().endswith(".mp3") and
        ("timpani" in x.filename.lower() or "kettle" in x.filename.lower()) and x.file_size>3000]
      if not choices: raise RuntimeError("No timpani recordings inside official Percussion.zip")
      choices.sort(key=lambda x:(("roll" in x.filename.lower()),x.file_size),reverse=True)
      info=choices[0]
      b=z.read(info)
      print("TIMPANI_SOURCE",info.filename,len(b))
      return save_audio(key,b,"mp3","https://philharmonia.co.uk/resources/sound-samples/")
  raise RuntimeError("Unknown "+key)

def patch_page(images,audios):
  target=ROOT/"index.html"
  content=target.read_text(encoding="utf-8")
  m=re.search(r"const I=(\[[^\n]*?\]),S=(\[[^\n]*?\]),Q=(\[[^\n]*?\]);",content)
  if not m: raise RuntimeError("Cannot locate original lesson data")
  ins=json.loads(m.group(1));snd=json.loads(m.group(2));que=json.loads(m.group(3))
  sounds=[]
  for ins_item in ins:
    key=ins_item["id"];ins_item["img"]=images[key]["url"]
    ins_item["sound"]=len(sounds)
    meta=audios[key]
    sounds.append([ins_item["name"]+" 실제 연주",meta["url"],"실제 녹음 · 출처와 이용조건: 자료 출처"])
  # Extra violin pizzicato can be added only after confirming its own source.
  content=content[:m.start()]+("const I="+json.dumps(ins,ensure_ascii=False,separators=(',',':'))+
                              ",S="+json.dumps(sounds,ensure_ascii=False,separators=(',',':'))+
                              ",Q="+json.dumps(que,ensure_ascii=False,separators=(',',':'))+";")+content[m.end():]
  # Main screen intro uses same existing YouTube iframe, not an unlicensed video copy.
  style=r"""
<style id="classroom-polish-v6">
body{background:linear-gradient(180deg,#f0f9ff 0%,#f9fcff 45%,#f0f8ff 100%)!important;color:#17344e!important;font-family:system-ui,'Apple SD Gothic Neo','Malgun Gothic',sans-serif!important}
header{background:#fff!important;border-bottom:4px solid #3ecdb4!important;box-shadow:0 3px 20px #246c9714}
header b{color:#0d4770!important;font-size:32px!important;letter-spacing:-.05em}
header small{color:#426783!important;font-size:18px!important}
#status{color:#007c70!important;font-weight:800}
.layout{max-width:1650px!important}
nav{border:1px solid #c8e5f4!important;box-shadow:0 8px 24px #1a63831a!important;border-radius:24px!important}
nav button{border-radius:14px!important}
nav button.sel{background:linear-gradient(100deg,#d7ecff,#daf9ee)!important;color:#12638c!important}
main{border-radius:30px!important;box-shadow:0 15px 45px #1a63831a!important}
h1{color:#144d78!important;font-size:clamp(37px,4vw,56px)!important}
p{color:#30566e!important;font-size:23px!important}
.topline{font-size:19px!important;color:#008e86!important}
.cards{gap:24px!important}
.card{border:1px solid #c9e6f5!important;background:#f8fcff!important;border-radius:25px!important;box-shadow:0 10px 28px #2e8fb415!important}
.card img{height:280px!important;object-fit:contain!important;background:#ebf5ff!important}
.card .inside{padding:22px!important}.card h3{font-size:33px!important;color:#19527b!important}
.card p{font-size:21px!important;color:#315771!important}
button{background:linear-gradient(110deg,#287be9,#2dc5b5)!important;border-radius:17px!important;font-size:21px!important;color:#fff!important}
button.alt{background:#edf7ff!important;color:#18578b!important}
.chip{background:#dffaf2!important;color:#047769!important;font-size:17px!important}
.section{background:#eaf9fc!important;border:1px solid #a8e2df!important;border-radius:23px!important}
.qbtn{background:#fff!important;color:#27577a!important;border-radius:18px!important}
.qbtn.correct{background:#d8fae9!important;color:#077a43!important}
.qbtn.wrong{background:#ffebef!important;color:#a42b48!important}
.ask{font-size:31px!important}.audio{background:#fff!important;border:1px solid #c9e3f4!important}
.audio audio{width:100%!important}.muted{font-size:18px!important;color:#486e8c!important}
@media(max-width:800px){.layout{grid-template-columns:1fr!important}.cards{grid-template-columns:1fr!important}}
</style>
"""
  content=content.replace("</head>",style+"</head>")
  # Fix error handling so fallback does not replace every instrument with a snare photograph.
  content=content.replace("function imageFallback(el){if(el.dataset.fallbackDone)return;el.dataset.fallbackDone='1';el.src='https://commons.wikimedia.org/wiki/Special:FilePath/Snare_Drum.jpg?width=1280';el.alt='악기 사진을 대체 이미지로 표시합니다.'}",
   "function imageFallback(el){el.style.background='#ffebed';el.alt='사진 로딩 오류';el.onerror=null;}")
  target.write_text(content,encoding="utf-8")
  (ROOT/"asset-credits.json").write_text(json.dumps({"images":images,"sounds":audios},ensure_ascii=False,indent=2),encoding="utf-8")
  credits=ROOT/"credits.html"
  link=lambda u:html.escape(u,quote=True)
  parts=["<meta charset='utf-8'><title>악기 음원 및 사진 출처</title><body style='font:18px sans-serif;max-width:800px;margin:30px auto'>",
   "<h1>교실용 수업 이미지·녹음 출처</h1><p>실연 음원은 Philharmonia Orchestra 또는 Wikimedia Commons 출처. Commons 음원의 이용허락 조건은 원문에서 확인할 수 있습니다.</p><ol>"]
  for x in ins:
    k=x["id"]
    parts.append("<li>"+html.escape(x["name"])+
      " <a href='"+link(images[k]["credit"])+"'>사진 출처</a> · "+
      "<a href='"+link(audios[k]["source"])+"'>녹음 출처 및 조건</a></li>")
  parts.append("</ol></body>")
  credits.write_text("\n".join(parts),encoding="utf-8")
  print("PATCHED_PAGE",len(content),flush=True)

def main():
  images={}
  for key in TITLES:images[key]=wiki_image(key)
  audios={}
  for key in TITLES:audios[key]=get_audio(key)
  assert len(images)==len(audios)==14
  patch_page(images,audios)
  print("ASSET_VERIFIED",json.dumps({"photos":len(images),"actual_recordings":len(audios)},ensure_ascii=False),flush=True)

if __name__=="__main__": main()
