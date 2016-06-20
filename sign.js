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

var MODULE = "sign.js";
var KAZOO = {};

function showMessage(message, fadeOut) {
	$("#status").text(message);
	$("#status").fadeIn();
	$("#status").fadeOut(fadeOut || 5000);
}

function addConnection(connection) {
	var connect = {}, connections, addConnect = true;

	connect[connection] = {
		url: $("#url").val(),
		acc: $("#accname").val(),
		user: $("#username").val()
	};

	if (localStorage["connections"] != null) {
		connections = $.parseJSON(localStorage["connections"]);

		$.each(connections, function(i, item) {
			if (item.url == connect[connection].url && item.acc == connect[connection].acc && item.user == connect[connection].user) {
				addConnect = false;
				return false;
			}
		});
	} else {
		connections = {};
	}

	if (addConnect) {
		$(".multiselect__select").append($("<option>", {
			value: connection,
			text: connection
		}).attr("acc", connect[connection].acc).attr("user", connect[connection].user).attr("url", connect[connection].url));
		connections[connection] = connect[connection];
		localStorage["connections"] = JSON.stringify(connections);
	}
}

function signin() {
	if(!validate_fields()) return;
	var connection = ($("#connection_select").val() == "new") ? $("#connection").val() : $("#connection_select").val();
	localStorage["url"] = $("#url").val();
	localStorage["username"] = $("#username").val();
	localStorage["accname"] = $("#accname").val();
	localStorage["credentials"] = CryptoJS.MD5(localStorage["username"] + ":" + $("#password").val()).toString();
	localStorage["notifications"] = "true";
	localStorage["account_id"] = "";
	localStorage["user_id"] = "";
	localStorage["errorMessage"] = "";
	localStorage["connectionStatus"] = "signedOut";

	chrome.runtime.sendMessage({type : "BG_RESTART"});

	wait(()=>{
		if (localStorage["connectionStatus"] == "signedIn"){
			addConnection(connection);
			chrome.tabs.getCurrent(function(tab) {
				chrome.tabs.remove(tab.id, function() {});
			});
		}

		return (localStorage["connectionStatus"] == "signedIn") || (localStorage["connectionStatus"] == "authFailed");
	}, {
		timeout_callback: ()=>{
			localStorage.removeItem("url");
			localStorage.removeItem("username");
			localStorage.removeItem("accname");
			localStorage.removeItem("credentials");
			localStorage.removeItem("connectionStatus");

			console.log(MODULE + "Connection timeout");
			showMessage("Connection timeout");},
		timeout: 6000
	});
}

function validate_fields(){
	var url = $("#url").val() || "";
	var username = $("#username").val();
	var accname = $("#accname").val();
	var password = $("#password").val();
	var url_parts = url.match(/(https?:\/\/)?([^:/]+)(:\d{0,5})?.*$/i);
	var is_valid = url.length == 0?   showMessage("Invalid url"):
		    username.length == 0? showMessage("Invalid username"):
		    accname.length == 0?  showMessage("Invalid account name"):
		    password.length == 0? showMessage("Invalid password"):
		    url_parts? true :     showMessage("Invalid url");
	if(is_valid){
		var protocol = url_parts[1] || "http://";
		var address = url_parts[2];
		var port = url_parts[3] || ":8000";
		var valid_url = protocol + address + port + '/';
		$("#url").val(valid_url);
	}
	return is_valid;
}

function restoreOptions() {
	var connections;
	localize();
	$("#server_select").focus();
	$(document).keypress(function(event) {
		if (event.keyCode == 13) {
			$('#signin').trigger('click');
		}
	});

	$(".language__img").on("click", function() {
		$(".language__ul").css("top", "-" + (($(".language__li").size() - 1) * 2 - 1) + "rem").toggle(300);
	});
	$(".language__li").on("click", flag_click_handler);

	if (localStorage["connections"] != null) {
		connections = JSON.parse(localStorage["connections"]);

		$.each(connections, function(i, connect) {
			$(".multiselect__select").append($("<option>", {
				value: i,
				text: i
			}).attr("acc", connect.acc).attr("user", connect.user).attr("url", connect.url));
		});
	}

	$(".multiselect__select").on("change", function() {
		if ($(this).val() !== "default") {
			if ($(this).val() === "new") {
				$(this).hide();
				$("#url").val("");
				$("#connection").val("");
				$("#accname").val("");
				$("#username").val("");
				$(".multiselect__input").show().focus();
			} else {
				$("#url").val($('option:selected', this).attr("url"));
				$("#accname").val($('option:selected', this).attr("acc"));
				$("#username").val($('option:selected', this).attr("user"));
			}
		} else {
			$("#url").val("");
			$("#accname").val("");
			$("#username").val("");
		}

		$("#password").val("");
	});
	$(".multiselect__input").on("dblclick", function() {
		$(this).hide();

		if ($(this).val() != "") {
			$("#password").val("");
			addConnection($(this).val());
		}

		$(".multiselect__select").val("default").show().focus();
	});

	var error = localStorage["errorMessage"];
	$("#password").val("");
	if (localStorage["errorMessage"] != undefined && localStorage["errorMessage"] != ""){
		localStorage["connectionStatus"] = "signedOut";
	} else {
		try {
			if (localStorage["connectionStatus"] == "signedIn") {
				//chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
				chrome.browserAction.setPopup({popup: "tabs.html"});
			}
		} catch (error) {
			$("#settings").show();

		}
	}
}

function flag_click_handler(e){
	$(".language__ul").toggle(300);
	localStorage.lang = e.currentTarget.id.substring(0,2);
	var message = { type : "UPDATE_LOCALIZATION"};
	chrome.runtime.sendMessage(message, ()=>{});
	window.setTimeout(localize, 500);
}

function showAboutBox() {
	localStorage["currentTab"] = "sign";
	top.location.assign("about.html");
}

//background error drawer
chrome.runtime.onMessage.addListener((a,b,c)=>{
	if (!a.sender == "KAZOO") return;

	if (a.type == "error") {
		var error_code = "status" in a.data? a.data.status: a.data.error;
		switch(error_code + ""){
		case "0":
			showMessage("Bad server url.");
			break;

		case "400":
		case "401":
			showMessage("Authorization error.");
			break;

		default:
			showMessage(a.data.statusText + " (" + a.data.status  + ")");
			console.log(a);
			break;
		}
	}
});


function localize(){
	try{
		var x = JSON.parse(localStorage["localization"]);

		$("#signin_label").text(x.signin_label.message);
		$("#connection_select option[value='default']").text(x.choose_connection.message);
		$("#connection_select option[value='new']").text(x.new_connection.message);
		$("#connection").attr("placeholder", x.connection.message);
		$("#url").attr("placeholder", x.url.message);
		$("#accname").attr("placeholder", x.accname.message);
		$("#username").attr("placeholder", x.username.message);
		$("#password").	attr("placeholder", x.password.message);
		$("#signin").text(x.signin.message);
		$("#about img").attr("title", x.about.message).attr("alt", x.about.message);
		$(".language__img").attr("title", x.lang.message).attr("alt", x.lang.message);

		$(".language__li").removeClass("language__li-active");
		if (localStorage.lang != null) {
			$("#" + localStorage.lang + "-flag").addClass("language__li-active");
		}
	}catch(e){
		console.log(e);
	}
}

// about
document.querySelector('#about').addEventListener('click', showAboutBox);

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#signin').addEventListener('click', signin);
