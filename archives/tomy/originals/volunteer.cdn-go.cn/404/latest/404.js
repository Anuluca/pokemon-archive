var isMobile = /(mobile)|(android)|(iphone)/i.test(navigator.userAgent);
var currentScript = document.currentScript?document.currentScript:document.scripts[document.scripts.length-1];
var head = document.getElementsByTagName("head")[0];

function createElementInHead(tagName,properties){
	let element = document.createElement(tagName);
	for(var i in properties) element[i]=properties[i];
	head.appendChild(element);
}
createElementInHead("base",{"href":"//volunteer.cdn-go.cn/404/latest/"})

createElementInHead("meta",{"name":"viewport","content":"width=device-width, initial-scale=1.0"})

createElementInHead("script",{"src":"404.jsonp.js","crossorigin":"anonymous","callback":(d)=>{render(d[Math.floor(Math.random()*d.length)])
}})

createElementInHead("script",{"src":"https://cdn-go.cn/aegis/aegis-sdk/latest/aegis.min.js","crossorigin":"anonymous","onload":()=>{const aegis = new Aegis({id:'aorgLlJTLfQVrxAwGe',uin:'',reportApiSpeed: true,reportAssetSpeed: true})}})

function render(data){
	var rendertarget=document.getElementById(currentScript.getAttribute("rendertarget"));
	if(rendertarget == null) rendertarget=document.body;
	rendertarget.innerHTML=isMobile?data.mobile:data.pc;
}


