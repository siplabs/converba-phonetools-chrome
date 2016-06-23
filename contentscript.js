/*
 Copyright 2016, SIPLABS LLC.

 Licensed under the Apache License,Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "ASIS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

function sendCallMessage(number) {
	window.confirm("Are you sure you want to call " + number + "?")?
		window.postMessage({type: "CALL", text: number}, "*"):
		console.log("Call canceled");
}

chrome.runtime.sendMessage({type : "IS_CLICK_TO_DIAL_ENABLED"}, function(response) {
	if (response.status == "true") {
		var replacer = new RegExp(/(?:^| )(?!(?:[0-3]?\d([- ])[0-3]?\d\1\d{2,4})|(?:\d{2,4}([- ])[0-3]?\d\2[0-3]?\d) )((?:[+]?\d{1,3}([- ]?))[(]?\d{2,4}[)]?\4\d{2,5}(-|\4?)\d{2,5}(?:\5\d{2,5}){0,2})(?: |$|.|,)/);
		var links = new RegExp(/tel:(.+)/);
		var treeWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, (node)=> {
			return (node.parentNode.tagName != 'TEXTAREA' && node.textContent.match(replacer))?
				NodeFilter.FILTER_ACCEPT: NodeFilter.FILTER_SKIP;
		}, false);

		var nodes = [];
		while (treeWalker.nextNode()) {
			nodes.push(treeWalker.currentNode);
		}
		console.log("found %o telphone numbers", nodes.length);

		var image = chrome.extension.getURL("images/click2dial.png");
		var replacement = " $3<img id='clicktocall' src='" + image + "' onClick=\"sendCallMessage('$3');\" /> ";
		var replacement2= " $3<img id='clicktocall' src='" + image + "'/> ";

		nodes.forEach((node)=>{
			if (node.parentNode) {
				node.parentNode.innerHTML = node.parentNode.innerHTML.replace(replacer, (node.parentNode.tagName == 'A')? replacement2: replacement);
			}
		});

		// Links handler
		var targets = Array.from(document.body.getElementsByTagName("a")).filter(
			(x)=>{return (x.href && x.href.trim().match(links));});

		targets.forEach((x)=>{
			var num = x.href.match(links)[1];
			if (num && num.length > 0){
				x.addEventListener('click', (e)=>{ sendCallMessage(num);});
				x.href = '#';
			}});

		console.log("found %o telphone numbers links", targets.length);

		window.addEventListener("message", (e)=> {
			if (e.source != window) {
				return;
			}
			if (e.data.type && (e.data.type == "CALL")) {
				chrome.runtime.sendMessage(e.data, ()=> {});
			}
		});
	}
});


function closeWindowNotifications() {
	$(".call__audio")[0].pause();
	$(".call__audio")[0].currentTime = 0;
	$(".call").filter(function() {return $(this).css("display") != "none";}).toggle(400, function() {
		$(".callup").css("animation", "none");
	});
}
var sumCall = 0;
$("body").append($("<div>", {class: "call"}).load(chrome.extension.getURL("injected.html"), function() {
	sumCall = 0;
	function sendAndClose(message){
		return ()=>{
			chrome.runtime.sendMessage({type: "BLACKHOLE_USER_ACTION", data: message}, (x)=>{});
			closeWindowNotifications();
			sumCall--;
		};
	}

	$("body").on("click", ".call__overlay", sendAndClose("OVERLAY"));
	$("body").on("click", ".callup__btn-profile", sendAndClose("VIEW_PROFILE"));
	$("body").on("click", ".callup__btn-reject", sendAndClose("REJECT"));
	$("body").on("click", ".callup__btn-keep", sendAndClose("KEEP_CALL"));
	$("body").on("click", ".callup__btn-forward", sendAndClose("CALL_FORWARDING"));
	$("body").on("mouseover", ".callup",  ()=>{$(".callup").css("animation", "none");});
	$("body").on("mouseleave", ".callup", ()=>{$(".callup").css("animation", "blink infinite 1.2s linear");});
	$(".call__audio").attr("src", chrome.extension.getURL("audio1.mp3"));
}));

var s = document.createElement("script");
s.src = chrome.extension.getURL("injected.js");
s.onload = function() {
	this.parentNode.removeChild(this);
};
(document.head || document.documentElement).appendChild(s);

chrome.runtime.onMessage.addListener((message, sender, callback)=>{
	if (message.sender === "KAZOO" &&
	    message.type === "event") {
		switch (message.data["Event-Name"]) {
		case "CHANNEL_CREATE":
			if (sumCall == 0) {
				sumCall++;
				$(".callup__number").text(message.data.number);
				$(".callup__name").text((message.data.in_phone_book_name ? (message.data.in_phone_book_name + " (" + message.data.name + ")") : message.data.name));

				$(".call").filter(function() {return $(this).css("display") == "none";}).toggle(400, function() {
					$(".callup").css("animation", "blink infinite 1.2s linear");
					$(".call__audio")[0].play();
				});
			}
			break;

		case "CHANNEL_ANSWER":
			closeWindowNotifications();
			break;

		case "CHANNEL_DESTROY":
			closeWindowNotifications();
			break;

		default:
			break;
		}
	}
});
