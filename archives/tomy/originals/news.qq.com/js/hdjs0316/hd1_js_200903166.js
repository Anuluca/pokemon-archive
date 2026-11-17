function changeImg(mypic){
	
	
    var xw=500; 
    var xl=500; 
         
    var width = mypic.width; 
    var height = mypic.height; 
    var bili = width/height;         
         
    var A=width/xw; 
    var B=height/xl; 
         
    if(A>1||B>1) 
    { 
        if(A>B) 
        { 
            mypic.width=xw; 
            mypic.height=xw/bili; 
        } 
        if(A<B) 
        { 
            mypic.width=xl*bili; 
            mypic.height=xl; 
        } 
    }
		
}



function GetCookieVal(offset)
//获得Cookie解码后的值
{
var endstr = document.cookie.indexOf (";", offset);
if (endstr == -1)
endstr = document.cookie.length;
return unescape(document.cookie.substring(offset, endstr));
}
function SetCookie(name, value)
//设定Cookie值
{
var expdate = new Date();
var argv = SetCookie.arguments;
var argc = SetCookie.arguments.length;
var expires = null;
var path = "/";
var domain = (argc > 4) ? argv[4] : null;
var secure = (argc > 5) ? argv[5] : false;

document.cookie = name + "=" + escape (value)
+((path == null) ? "" : ("; path=" + path)) +((domain == null) ? "" : ("; domain=" + domain))
+((secure == true) ? "; secure" : "");
}
function DelCookie(name)
//删除Cookie
{
var exp = new Date();
exp.setTime (exp.getTime() - 1);
var cval = GetCookie (name);
document.cookie = name + "=" + cval + "; expires="+ exp.toGMTString();
}
function GetCookie(name)
//获得Cookie的原始值
{
var arg = name + "=";
var alen = arg.length;
var clen = document.cookie.length;
var i = 0;
while (i < clen)
{
var j = i + alen;
if (document.cookie.substring(i, j) == arg)
return GetCookieVal (j);
i = document.cookie.indexOf(" ", i) + 1;
if (i == 0) break;
}
return null;
}


function SaveTime()
{
 var t=document.getElementById("cSpeed").value
 if(t>0)
 {
    SetCookie("cSpeed", t)
    timer = setInterval("play()",t*1000);
 }
}

var gtime=GetCookie("cSpeed")
if( gtime >0 )
{
  document.getElementById("cSpeed").value=gtime;
}
else
{
  document.getElementById("cSpeed").value=6;
  SetCookie("cSpeed", 6);
}

var canbe=false;
if(GetCookie("canbe") != null)
{
  if(GetCookie("canbe")=="1")
  { 
   canbe=true;
   document.getElementById("pb").style.display="none"; 
   document.getElementById("sb").style.display="inline";  
  }
  else
  {
   document.getElementById("pb").style.display="inline";   
document.getElementById("sb").style.display="none";
  }
}
else{
SetCookie("canbe", 0);
document.getElementById("pb").style.display="inline";   
document.getElementById("sb").style.display="none";
}

if(canbe)
{
mytimer = setInterval("play()",GetCookie("cSpeed")*1000);
}
function playpic()
{  
   canbe=true;
   document.getElementById("pb").style.display="none"; 
   document.getElementById("sb").style.display="inline";  
   SetCookie("canbe",1);
   mytimer = setInterval("play()",GetCookie("cSpeed")*1000);
}
function play()
{
  if(canbe)
  {
      window.location.href = nextUrl;     
  }
}
function stop()
{
  document.getElementById("pb").style.display="inline";   
   document.getElementById("sb").style.display="none";
  canbe=false;
  SetCookie("canbe",0);
}

function LeaveWin()
{
if ((event.clientX>document.body.clientWidth && event.clientY<0)||event.altKey||(event.clientY<0))
try{
DelCookie("cSpeed");
DelCookie("canbe");
}catch(e){}
}
//自动播放结束




function PgaePerv2(obj)
{
  if(pervNews != "#pervNewsUrl")
  {
	  document.getElementById("PgaePerv").style.cursor="pointer";
	  document.getElementById("PgaePerv").alt="浏览上一篇新闻";
  }else{
		document.getElementById("PgaePerv").className = "ss";
  }
}
function PgaeNext2(obj)
{
  if(nextNews != "#nextNewsUrl")
  {
	  document.getElementById("PgaeNext").style.cursor="pointer";
	  document.getElementById("PgaeNext").alt="浏览下一篇新闻";
  }else{
		document.getElementById("PgaeNext").className = "ss";
		DelCookie("cSpeed");
		DelCookie("canbe");
  }
}

function goPgaePerv(obj)
{
  if(pervNews != "#pervNewsUrl")
  {
	  window.location.href = pervNews;
  }
}
function goPgaeNext(obj)
{
  if(nextNews != "#nextNewsUrl")
  {
	  window.location.href = nextNews;
  }
}/*  |xGv00|7f3049bd3fad342636322f68e7e835ab */