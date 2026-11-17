




//动态图片链接
var Urls = document.location.href;
var name;
var Urls_qian = Urls.substring(0,Urls.indexOf("/a/")+12);
if(Urls.indexOf("/a/")> 0) {
name=Urls.substring(Urls.indexOf("/a/")+12,Urls.indexOf("/a/")+18);
var name_temp = name;
if(name.indexOf("_")> 0){name=name_temp.split("_")[0]}
} 
function changeUrl(obj){
var zhuan = obj;
if(obj==0){var newUrl = Urls_qian+name+".htm";}
else{
zhuan = obj;
var newUrl = Urls_qian+name+"_"+zhuan+".htm";
}
document.location.href = newUrl;
}/*  |xGv00|d4cddfad9589dd59832701fd08224ae1 */