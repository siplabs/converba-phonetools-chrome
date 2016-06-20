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

var MODULE = "dotabs.js";
if(localStorage["connectionStatus"] != "signedIn") signout(false);

// Signout. A manual signout means the user signed out themselves. In this case,
// clear out all info. If a force logout
// due to an authentication error or some other error, then retain some
// information.
function signout(manual) {
	localStorage.removeItem("vm_daemon_id");
	localStorage.removeItem("auth_daemon_id");
	localStorage.removeItem("authTokens");
	localStorage.removeItem("name");
	localStorage.removeItem("currentTab");
	localStorage.removeItem("connectionStatus");
	localStorage.removeItem("credentials");
	localStorage.removeItem("account_id");
	localStorage.removeItem("user_id");
	if (manual) {
		for(var key in localStorage){
			if (key !== "connections") {
				localStorage.removeItem(key);
			}
		}
	}
	chrome.runtime.sendMessage({type : "GENTLY_OPEN_PAGE", url: "sign.html"}, ()=>{});
	chrome.runtime.sendMessage({type : "BG_RESTART"}, ()=>{});
	window.close();
}

function history_handler(e){
	var tel = $(this).find("td:nth-child(2) span").text();

	chrome.runtime.sendMessage({
		type : "CALL",
		text : tel
	}, ()=>{
		$("#tabs").tabs("option", "active", 0);
		$("#tabs").tabs("option", "active", 2);
	});

	return null;
}


function restoreTabs() {
	// create tabs
	$("#flags").hide();
	$("#tabs").tabs();

	// add activate(select) event handler for tabs
	$("#tabs").tabs(
		{
			activate : function(event, ui) {
				var new_panel_id = ui.newPanel.attr("id");
				localStorage["currentTab"] = new_panel_id;
				switch(new_panel_id){
				case "history":
					var history = storage.get("history", []);
					$("#calllogentries").empty();
					$("#calllogentries")[0].appendChild(document.createElement("tbody"));
					history.forEach((entry)=>{
						create_default_history_row(entry.type, entry.name, entry.number, entry.time);
					});
					$("#calllogentries").on("click", "tr", history_handler);
					break;

				case "messages":
					var msg_list = storage.get("vm_boxes", []);
					$("#msgtable").empty();
					switch(msg_list.length){
					case 0:
						draw_no_vm_logo();
						break;

					case 1:
						showVMMessages({currentTarget: {id: msg_list[0].id}});
						break;

					default:
						for ( var i = 0; i < msg_list.length; i++) {
							var new_row = create_box_row(msg_list[i].name, msg_list[i].mailbox, msg_list[i].messages, !msg_list[i].old, msg_list[i].id);
							$(new_row).on("click", showVMMessages);
							$("#msgtable").append(new_row);
							msg_list[i].old = true;
						}
						break;
					}

					localStorage["vm_boxes"] = JSON.stringify(msg_list);
					break;

				case "phonebook":
					var pb_list = storage.get("phone_book", []);
					$("#phonebookentries").empty();
					// Create the first one table entry with input fields for creating new entries in phone book
					// || <input name> | <input number> | <add button> ||
					create_input_pb_row();
					//Fill phonebook table
					// || name | phone | remove_btn ||
					for ( var z = 0; z < pb_list.length; z++) {
						create_default_pb_row(pb_list[z].value.name, pb_list[z].value.phone, pb_list[z].id, z);
					}
					break;

				case "fax":
					var fax_list = storage.get("faxes", []);
					var new_faxes_list = storage.get("new_faxes", []);
					$("#faxentries").empty();
					create_input_fax_row();
					fax_list.forEach((fax)=>{
						create_default_fax_row(fax.name, fax.from_number, fax.id, new_faxes_list.includes(fax.id));
					});
					storage.set("new_faxes", []);
					break;
				case "conference":

					break;
				}
			}
		});

	// restore current tab
	switch(localStorage["currentTab"]){
	case "messages":
		$("#tabs").tabs("option", "active", 1);
		$("#tabs").tabs("option", "active", 0);
		if (localStorage.connectionStatus == "signedIn") {
			chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
		}
		break;
	case "phonebook":
		$("#tabs").tabs("option", "active", 1);
		break;
	case "history":
		$("#tabs").tabs("option", "active", 2);
		break;
	case "fax":
		$("#tabs").tabs("option", "active", 3);
		break;
	// case "conference":
	// 	$("#tabs").tabs("option", "active", 4);
	// 	break;
	default:
		$("#tabs").tabs("option", "active", 1);
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
		break;
	}

	var popup_heigth = localStorage["popup_heigth"] || 480;
	set_popup_heigth(popup_heigth);
	var resizer = document.getElementById("toolbar");
	resizer.onmousedown = (e)=>{
		$("body").css("-webkit-user-select", "none");
		window.getSelection().removeAllRanges();
		resizer.onmousemove = (e)=>{
			console.log(e.pageY);
			if (e.pageY < 250 || e.pageY > 570) return;
			var new_len = (e.pageY - 80) ;
			set_popup_heigth(new_len);
			localStorage["popup_heigth"] = new_len;
		};
		resizer.onmouseup = (e)=>{
			resizer.onmousemove = null;
		};
		resizer.onmouseout = (e)=>{
			resizer.onmousemove = null;
			$("body").css("-webkit-user-select", "auto");
		};
		e.preventDefault();
	};

	$(".btn_added:not(#btn12)").on("click", btn_handler);
	$("#btn12").on("click", call_btn);
	$("#destination").on('keydown', function(e) {
		if (e.which == 13) {
			call_btn();
		} else {
			if ($(this).val().length < 25 && ((e.which === 8 || e.which === 37 || e.which === 39) ||
				(((e.which >= 48 && e.which <= 57) || (e.which >= 96 && e.which <= 105)) && (this.selectionStart === 0 && $(this).val()[0] !== "+" || this.selectionStart !== 0)) ||
				((e.which === 187 || e.which === 107) && this.selectionStart === 0 && $(this).val().replace("+", "") === $(this).val()))) {
			} else {
				return false;
			}
		}
	});
	$("#pb_new_phone").on('keydown', function(e) {
		if (e.which == 13) {
			$(".add_phone").trigger("click");
		} else {
			if ($(this).val().length < 25 && ((e.which === 8 || e.which === 37 || e.which === 39) ||
				(((e.which >= 48 && e.which <= 57) || (e.which >= 96 && e.which <= 105)) && (this.selectionStart === 0 && $(this).val()[0] !== "+" || this.selectionStart !== 0)) ||
				((e.which === 187 || e.which === 107) && this.selectionStart === 0 && $(this).val().replace("+", "") === $(this).val()))) {
			} else {
				return false;
			}
		}
	});

	$("#cfabutton").on("click", ()=>{chrome.runtime.sendMessage({type: "SWITCH_CALL_FORWARD"});});
	$("#dndbutton").on("click", ()=>{chrome.runtime.sendMessage({type: "SWITCH_DND"}, ()=>{});});
	updateDNDButtonImage();
	updateCFButtonImage();
	
	$("#options").on("click", ()=>{
		chrome.runtime.sendMessage({type : "GENTLY_OPEN_PAGE", url: "options.html"}, ()=>{});
		window.close();
	});

	localize();
}

function create_default_fax_row(name, phone, fax_id, is_new){
	var table = $("#faxentries")[0].childNodes[0];
	var pos = table.childNodes.length;
	table.insertRow(pos);
	table.rows[pos].insertCell(0);
	table.rows[pos].insertCell(1);
	table.rows[pos].insertCell(2);

	table.rows[pos].cells[0].appendChild(document.createElement("p"));
	table.rows[pos].cells[0].childNodes[0].appendChild(document.createTextNode(name));
	table.rows[pos].cells[0].appendChild(document.createTextNode(phone));
	if(is_new) table.rows[pos].cells[1].style.backgroundColor = "green";

	table.rows[pos].cells[2].appendChild(document.createElement("img"));
	table.rows[pos].cells[2].childNodes[0].src = "images/download.ico";
	table.rows[pos].cells[2].childNodes[0].style.height = "24px";
	table.rows[pos].cells[2].childNodes[0].style.width = "24px";
	table.rows[pos].cells[2].childNodes[0].onclick = (e)=>{
		chrome.downloads.download({
			url: localStorage["url"] + "v2/accounts/" + localStorage["account_id"] + "/faxes/incoming/" +
				fax_id + "/attachment?auth_token=" + localStorage["authTokens"]
		});};
}

function create_input_fax_row(){
	var table = $("#faxentries")[0].appendChild(document.createElement("tbody"));
	var translate = storage.get("localization", {
		"fax_send": {"message": "name"}
	});
	table.insertRow(0);
	table.rows[0].insertCell(0).colSpan = 3;
	$(table.rows[0].cells[0]).append($("<button/>", {class: "sendfax__btn"}));
	$(".sendfax__btn").text(translate.fax_send.message);
	table.rows[0].cells[0].childNodes[0].onclick = (e)=>{
		chrome.runtime.sendMessage({type : "GENTLY_OPEN_PAGE", url: "send_fax.html"}, ()=>{});
	};
}

function draw_no_vm_logo(){
	var popup_heigth = storage.get("popup_heigth", 480);
	var p1, p2, img, h3_1, h3_2;
	var translate = storage.get("localization", {
		"no_voicemail_msg1": {"message": "You have no voicemails yet..."},
		"no_voicemail_msg2": {"message": "...make a rest"}
	});

	p1= document.createElement("p");
	p2= document.createElement("p");
	h3_1= document.createElement("h3");
	//h3_2= document.createElement("h3");
	h3_1.innerText = translate.no_voicemail_msg1.message;
	//h3_2.innerText = translate.no_voicemail_msg2.message;
	p1.appendChild(h3_1);
	//p2.appendChild(h3_2);
	img = document.createElement("img");

	img.src = "images/no_voicemailbox.png";

	$(img).css({
		"height": "calc(100vh - 400px)",
		"min-height": "48px",
		"border-radius": "50%",
		"background-color": "#35b"
	});

	$("#msgtable").append(p1);
	if(popup_heigth > 320){
		$("#msgtable").append(img);
		$("#msgtable").append(p2);
	}
}

function create_default_history_row(type, name, number, time){
	var table = $("#calllogentries")[0].childNodes[0];
	var pos = table.childNodes.length;
	table.insertRow(pos);
	table.rows[pos].insertCell(0);
	table.rows[pos].insertCell(1);
	table.rows[pos].insertCell(2);

	table.rows[pos].cells[0].appendChild(document.createElement("img"));
	table.rows[pos].cells[0].childNodes[0].src = "images/" + type + ".png";
	table.rows[pos].cells[0].childNodes[0].style.height = "24px";
	table.rows[pos].cells[0].childNodes[0].style.width = "24px";

	table.rows[pos].cells[1].appendChild(document.createElement("p"));
	table.rows[pos].cells[1].childNodes[0].appendChild(document.createTextNode(name));
	table.rows[pos].cells[1].appendChild(document.createElement("span"));
	table.rows[pos].cells[1].childNodes[1].appendChild(document.createTextNode(number));

	table.rows[pos].cells[2].appendChild(document.createTextNode(time));
	// for ( var i = 0; i < history.length; i++) {

	// 	var row = "<tr id='calllogentry" + i + "_" + list[i].number + "'>";
	// 	if (list[i].type == "outgoing") {
	// 		row += "<td><img src='images/outcoming.png '/></td>";
	// 	} else if (list[i].type == "received") {
	// 		row += "<td><img src='images/incoming.png'/></td>";
	// 	} else {
	// 		row += "<td><img src='images/reject.png'/></td>";
	// 	}
	// 	row += "<td><p>" + list[i].name	+ "</p><span>" + list[i].number + "</span></td>";
	// 	row += "<td>" + formatTimestamp(list[i].time) + "</td>";
	// 	$("#calllogentries").append(row);
	// }
}

function showVMMessages(e){
	var vmbox_id = e.currentTarget.id;
	var media_list = storage.get("vm_media", {});

	$("#msgtable").empty();
	if(!media_list[vmbox_id]) return;
	if (media_list[vmbox_id].length == 0) {
		draw_no_vm_logo();
	} else {
		for (var i = 0; i < media_list[vmbox_id].length; i++) {
			var new_info_row = create_info_media_row(media_list[vmbox_id][i].caller_id_name,
								 "", // media_list[vmbox_id][i].from,
								 media_list[vmbox_id][i].caller_id_number,
								 vmbox_id,
								 media_list[vmbox_id][i].media_id );
			//var new_player_row = create_play_media_row(vmbox_id, media_list[vmbox_id][i].media_id);

			//$(new_info_row).append(new_player_row);
			$("#msgtable").append(new_info_row);
		}
		setTimeout(function() {
			for (var i = 0; i < media_list[vmbox_id].length; i++) {
				var new_player_row = create_play_media_row(vmbox_id, media_list[vmbox_id][i].media_id);

				$("#msgtable").find(".mes__row").eq(i).append(new_player_row);
			}
		}, 0);
	}
	$("#msgtable").off("click", ".mes__row");
	$("#msgtable").on("click", ".mes__row", function() {
		var audio = $(this).find("audio");
		$(audio).closest(".mes__audio").toggle(300);
	});

	if (storage.get("vm_boxes", []).length > 1) {
		$("#msgtable").append("<div class='back'>Back</div>");
		$(".back").one("click", function() {
			$("#msgtable").off("click", ".mes__row");
			$("#tabs").tabs("option", "active", 1);
			$("#tabs").tabs("option", "active", 0);
		});
	}
}

function create_play_media_row(vmbox_id, media_id){
	var src = localStorage["url"] + "v2/accounts/" +
			localStorage["account_id"]+ "/vmboxes/" +
			vmbox_id + "/messages/" + media_id +
			"/raw?auth_token="+ localStorage["authTokens"];

	return $("<div class='mes__audio'><audio controls='true'><source type='audio/ogg' src='" + src + "' /></audio></div>");
}

function set_popup_heigth(new_len){
	$("#tabs")[0].style.height = (new_len - 150) + "px";
	$("#messages")[0].style.height = (new_len - 190) + "px";
	$("#phonebook")[0].style.height = (new_len- 190) + "px";
	$("#history")[0].style.height = (new_len- 190) + "px";
	$("#fax")[0].style.height = (new_len- 190) + "px";
}

function create_input_pb_row(){
	var input_field, col1, col2, col3, input1, input2, image;
	var translate = storage.get("localization", {
		"pb_name_placeholder": {"message": "name"},
		"pb_phone_placeholder": {"message": "phone number"}
	});

	input_field = document.createElement("tr");
	col1 = document.createElement("td");
	col2 = document.createElement("td");
	col3 = document.createElement("td");
	input1 = document.createElement("input");
	input2 = document.createElement("input");
	image = document.createElement("img");

	input1.id = "pb_new_name";
	$(input1).attr("class", "input input-phonebook");
	input1.placeholder = translate["pb_name_placeholder"].message;
	input1.size=14;
	input2.id = "pb_new_phone";
	$(input2).attr("class", "input input-phonebook");
	input2.placeholder = translate["pb_phone_placeholder"].message;
	input2.size=16;
	image.src = "images/add.png";
	$(image).attr("class", "add_phone");

	col1.appendChild(input1);
	col2.appendChild(input2);
	col3.appendChild(image);

	input_field.appendChild(col1);
	input_field.appendChild(col2);
	input_field.appendChild(col3);

	$("#phonebookentries").append(input_field);

	$("body").on("click", ".add_phone", function() {
		chrome.runtime.sendMessage({type : "GENTLY_OPEN_PAGE", url: "add_to_phonebook.html"}, ()=>{});
	});

	$("#pb_new_name").on('input', text_input_handler_names);
	$("#pb_new_phone").on('input', text_input_handler_phones);
}

function text_input_handler_names(e){
	var table = $("#phonebookentries");
	var template = e.currentTarget.value + "";
	var text = "";
	table.children().children().map((index, object)=>{
		if(index == 0) return;
		text = object.childNodes[0].childNodes[0].textContent;
		if (text.search(template) == -1) {
			object.style.visibility = "hidden";
		} else {
			object.style.visibility = "visible";
		}
	});
}

function create_info_media_row(from, number, name, box_id, media_id){
	var row, col1, col2, col3, p1, img;
	row = $("<div class='mes__row'></div>");
	col1 = $("<div class='mes__col mes__col-1'></div>");
	col2 = $("<div class='mes__col mes__col-2'></div>");
	col3 = $("<div class='mes__col mes__col-3'></div>");
	p1= $("<p class='mes__p'></p>");
	img = $("<img class='mes__img' />");

	$(p1).text(from).attr("title", from);
	$(img).attr("src", "images/remove.png").css("width", "auto");
	$(img).on("click", (e)=>{
		if (confirm("Delete voicemail from " + name + "?")) {
			chrome.runtime.sendMessage({
				type: "VOICE_MAIL_DELETE_ENTRY",
				data: {media_id: media_id,
				       vmbox_id: box_id}
			});
			var old_state = storage.get("vm_media", {});
			old_state[box_id] = old_state[box_id].filter((x)=>{ return x.media_id != media_id;});
			storage.set("vm_media", old_state);
			e.currentTarget.parentNode.parentNode.remove();
		}
	});
	$(col1).text(number).attr("title", number);
	$(col1).append(p1);
	$(col2).text(name).attr("title", name);
	$(col3).append(img);

	$(row).append(col1).append(col2).append(col3);

	return row;
}

function create_box_row(name, phone, count, is_new, id){
	var row, col1, col2, col3, p1, img;
	row = $("<div class='mes__row'></div>");
	col1 = $("<div class='mes__col mes__col-1'></div>");
	col2 = $("<div class='mes__col mes__col-2'></div>");
	col3 = $("<div class='mes__col mes__col-3'></div>");
	p1= $("<p class='mes__p'></p>");
	img = $("<img class='mes__img' />");

	$(p1).text(name).attr("title", name);
	$(img).attr("src", "images/msg_" + (is_new ? "new.jpg" : (count > 0 ? "not_empty.png" : "empty.png")))
			.attr("title", (is_new ? "New" : (count > 0 ? "Not empty" : "Empty")));
	$(col1).text(phone).attr("title", phone);
	$(col1).append(p1);
	$(col2).text(count);
	$(col3).append(img);

	$(row).append(col1).append(col2).append(col3);
	$(row).attr("id", id);

	return row;
}

function text_input_handler_phones(e){
	var table = $("#phonebookentries");
	var text = "";
	var template = e.currentTarget.value + "";
	template = template.replace("+", "\\+");
	table.children().children().map((index, object)=>{
		if(index == 0) return;
		text = object.childNodes[1].childNodes[0].textContent;
		if (text.search(template) == -1) {
			object.style.visibility = "hidden";
		} else {
			object.style.visibility = "visible";
		}
	});
}

function create_default_pb_row(name, phone, id, index){
	index = index? index: 100 + Math.random();

	var row, col1, col2, col3, p1, p2, img;
	row = document.createElement("tr");
	col1 = document.createElement("td");
	col2 = document.createElement("td");
	col3 = document.createElement("td");
	p1= document.createElement("p");
	p2= document.createElement("p");
	img = document.createElement("img");

	p1.innerText = name;
	p2.innerText = phone;
	img.src = "images/remove.png";
	img.id = id;
	img.onclick = (e)=>{
		if (confirm("Do you want to delete '" + $("#"+ e.currentTarget.id)[0].parentNode.parentNode.childNodes[0].childNodes[0].innerText + "' ?")) {
			e.currentTarget.parentNode.parentNode.remove();
			chrome.runtime.sendMessage({
				type : "PHONE_BOOK_REMOVE_ENTRY",
				entry_id: e.currentTarget.id }, ()=>{});
		}
	};
	col1.appendChild(p1);
	col2.appendChild(p2);
	col3.appendChild(img);
	col1.onclick = (e)=>{
		chrome.runtime.sendMessage({
			type : "CALL",
			text : e.currentTarget.parentNode.childNodes[1].childNodes[0].innerText }, ()=>{});
	};
	col2.onclick = (e)=>{
		chrome.runtime.sendMessage({
			type : "CALL",
			text : e.currentTarget.childNodes[0].innerText }, ()=>{});
	};

	row.id = "calllogentry'" + index + "_" + name;
	row.appendChild(col1);
	row.appendChild(col2);
	row.appendChild(col3);

	$("#phonebookentries").append(row);
}

function updatePhoneBook(){
	var message = { type : "UPDATE_PHONE_BOOK"};
	chrome.runtime.sendMessage(message, ()=>{});
}

function updateDNDButtonImage(){
	var src = "images/";
	switch(localStorage.dnd){
	case "true":
		src += "dnd_active.png";
		break;

	case "false":
		src += "dnd_normal.png";
		break;

	default:
		src += "logo_wait_128x128.gif";
	}
	$("#dndbutton")[0].src =  src;
}

function updateCFButtonImage(){
	var src = "images/";
	switch(localStorage.call_forward){
	case "true":
		src += "cf_enabled.png";
		break;

	case "false":
		src += "cf_disabled.png";
		break;

	default:
		src += "logo_wait_128x128.gif";
	}
	$("#cfabutton")[0].src =  src;
}

function localize(){
	try{
		var x = storage.get("localization", {});

		$("#signout_text")[0].innerText = x.signout_text.message;
		$("#history_tab")[0].title = x.history_tab.message;
		$("#destination")[0].placeholder = x.phone_num.message;
		$("#dndbutton")[0].title = x.dndbutton.message;
		$("#options")[0].title = x.pref_tab.message;
		$("#about")[0].title = x.about.message;
		$("#cfabutton")[0].title = x.cfabutton.message;

		$("#msg_tab")[0].title = x.msg.message;
		$("#phonebook_tab")[0].title = x.phonebook.message;
		$("#fax_tab")[0].title = x.fax.message;
		//$("#conf_tab")[0].title = x.conference.message;
	}catch(e){
		console.log(MODULE + ", Localization error: %o", e);
	};
}


function btn_handler(e){
	var dest = $("#destination");
	var shift = 0;
	var selStart = dest[0].selectionStart;
	if ((e.currentTarget.textContent >= 0 && e.currentTarget.textContent <= 9 && (selStart === 0 && dest.val()[0] !== "+" || selStart !== 0)) ||
		(e.currentTarget.textContent === "+" && selStart === 0 && dest.val().replace("+", "") === dest.val())) {
		if (dest.val().length < 24) {
			dest.val(dest.val().substr(0, selStart) + e.currentTarget.textContent + dest.val().substr(selStart));
			shift = 1;
		}
	}

	dest.focus();
	dest[0].setSelectionRange(selStart + shift, selStart + shift);
}

function call_btn(){
	var message = {
		type : "CALL",
		text : $("#destination").val()
	};
	$("#destination").val("");
	chrome.runtime.sendMessage(message, ()=>{});
}

function showAboutBox() {
	top.location.assign("about.html");
}

function showMessage(message, fadeOut) {
	$("#error_msg").text(message);
	$("#error_msg").fadeIn();
	$("#error_msg").fadeOut(fadeOut || 5000);
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

		case "429":
			showMessage("Too many requests.");
			break;

		case "400":
		case "401":
			showMessage("Authorization error.");
			break;

		default:
			showMessage(a.data.statusText + ("status" in a.data?("(" + a.data.status  + ")"):""));
			console.log(a);
			break;
		}
	} else if (a.type == "action") {
		switch(a.data.action){
		case "update_DND_icon":
			updateDNDButtonImage();
			break;

		case "update_CF_icon":
			updateCFButtonImage();
			break;

		default:
			//showMessage("Unknown action " + a.data.action);
			console.log(a);
			break;
		}
	}
});


// retrieve stored name
$("#name").text(localStorage["name"]);

// signout
document.querySelector('#signout').addEventListener('click', function() {
	signout(true);
});

// about
document.querySelector('#about').addEventListener('click',
		showAboutBox);

document.addEventListener('DOMContentLoaded', restoreTabs);
