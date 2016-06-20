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

var MODULE = "background.js";
var KAZOO = {};
var SOCKET = {};
var AUTH_DAEMON_ID;
var VM_DAEMON_ID;
var FAX_DAEMON_ID;
var HISTORY_DAEMON_ID;

function onMessage(request, sender, sendResponse) {
	var type = request.type;
	switch (type){
	case "CALL":
		if(is_too_fast("last_call_time", 3000)) return;
		var destination = request.text.replace(/[- \)\(\.]/g, "");
		console.log(MODULE + " calling: " + destination);
		if (storage.get("active_device", "auto") === "auto") {
			KAZOO.user.quickcall({
				number: destination,
				account_id: localStorage["account_id"],
				userId: localStorage["user_id"]
			});
		}else{
			KAZOO.device.quickcall({
				number: destination,
				account_id: localStorage["account_id"],
				deviceId: localStorage["active_device"]
			});
		}

		sendResponse({
			status : "ok"
		});
		break;

	case "IS_CLICK_TO_DIAL_ENABLED":
		sendResponse({
			status : localStorage["clicktodial"]
		});
		break;
	case "SWITCH_CALL_FORWARD":		
		switch_call_forward();
		break;

	case "BG_RESTART":
		remove_workers();
		contentLoaded();
		break;

	case "UPDATE_LOCALIZATION":
		updateLocalization();
		sendResponse();
		break;

	case "UPDATE_PHONE_BOOK":
		updatePhoneBook();
		break;

	case "PHONE_BOOK_ADD_ENTRY":
		delete request["type"];
		sendResponse(!phoneBookAddEntry(request));
		break;

	case "PHONE_BOOK_REMOVE_ENTRY":
		phoneBookRemoveEntry(request.entry_id);
		break;

	case "SWITCH_DND":
		switchDND();
		break;


	case "BLACKHOLE_USER_ACTION":
		blackholeUserActionHandler(request.data);
		break;

	case "VOICE_MAIL_DELETE_ENTRY":
		voiceMailDeleteEntryHandler(request.data);
		break;

	case "GENTLY_OPEN_PAGE":
		gentlyOpenPage(request.url);
		break;

	case "SEND_FAX":
		sendResponse(!send_fax(request));
		break;
	}
}

function send_fax(request){
	if(is_too_fast()) return false;
	console.log("Sending fax to %o", request.to_number);
	var data = {
		"document":{
			"url": request.attachment,
			"method":"get"
		},
		"retries":3,
		"to_name": request.to_name,
		"to_number": request.to_number
	};
	switch(request.caller_id){
	case undefined:
		return false;

	case "account":
		data.from_name = localStorage.account_external_caller_name;
		data.from_number = localStorage.account_external_caller_number;
		break;
		
	case "user":
		data.from_name = localStorage.user_external_caller_name;
		data.from_number = localStorage.user_external_caller_number;
		break;
		
	default:
		var device = storage.get("devices", [])[request.caller_id];
		data.from_name = device.external_caller_name;
		data.from_number = device.external_caller_number;		
	}
	KAZOO.faxes.send({account_id: localStorage.account_id, data: data});
	
	return true;
}

function updateFax(){
	if(is_too_fast()) return;
	var faxbox_id = storage.get("faxbox_id", "");
	if(faxbox_id == "none") return;
	if(faxbox_id){
		KAZOO.faxes.incoming({account_id: localStorage["account_id"],
				      filters: { filter_faxbox_id: localStorage["faxbox_id"] },
				      success: (data, status)=>{
					      var new_faxes = substract(data.data.map((x)=>{return x.id;}),
									storage.get("faxes", []).map((x)=>{return x.id;}));
					      if (new_faxes.length > 0 && localStorage.onNewFaxNotification === "true") {
						      var message = new_faxes.length > 1? "Received " + new_faxes.length + " faxes":
							  "Received fax from " + data.data.filter((x)=>{return x.id === new_faxes[0];}).caller_id_name;
						      chrome.notifications.create("Kazoo chrome extension fax event", {
							      type: "basic",
							      iconUrl: "images/fax-push.png",
							      title: "Received fax",
							      isClickable: false,
							      buttons: [],
							      message: message,
							      contextMessage: ""// EventJObj.data["Caller-ID-Number"]
						      }, ()=>{});
					      }
					      storage.set("faxes", data.data);
					      storage.set("new_faxes", union(storage.get("new_faxes", []), new_faxes));
				      },
				      error: (data, status)=>{
					      console.log("updateFax error, code %o", status.status);
					      storage.set("faxes", []);
				      }});
	}else{
		console.log("No faxbox_id, try to get");
		executeWithDelay([getMyFaxBoxId, updateFax], 4000);
	}
}

function getMyFaxBoxId(){
	if(is_too_fast()) return;
	KAZOO.faxbox.list({account_id: localStorage["account_id"],
			   filters: { filter_owner_id: localStorage["user_id"] },
			   success: (data, status)=>{
				   if (data.data.length > 0) {
					   localStorage["faxbox_id"] = data.data[0].id;
				   }else{
					   console.log("No faxbox, try to create");
					   createFaxBox();
				   }
			   },
			   error: (data, status)=>{
				   console.log("getMyFaxBoxId error, code %o", status.status);
			   }});
}

function createFaxBox(){
	if(is_too_fast(undefined, 60000)) return;
	console.log("Sorry, no faxboxes for you");   //TODO
	localStorage["faxbox_id"] = "none";
	// KAZOO.faxbox.create({account_id: localStorage["account_id"], success: (data, status)=>{

	// }, error: (data, status)=>{
	// 	console.log("createFaxBox error, code %o", status.status);
	// }});
}

function voiceMailDeleteEntryHandler(data){
	if(is_too_fast()) return;
	console.log("Delete voicemail entry %o", data);
	KAZOO.voicemail.delete({
		account_id: localStorage["account_id"],
		voicemailId: data.vmbox_id,
		msg_id: data.media_id,
		success: (x)=>{}
	});
}

function phoneBookAddEntry(request){
	if(is_too_fast()) return false;
	if ((request.name.length > 0 || request.last_name.length > 0)
	    && request.phone.length > 0
	    && localStorage["phoneBookListId"]) {
		console.log("New entry in phonebook: %o", request);
		KAZOO.lists.addEntry({account_id: localStorage["account_id"],
				      success: updatePhoneBook,
				      list_id: localStorage["phoneBookListId"],
				      data: request
				     });
		return true;
	}
	return false;
}

function updateLocalization(){
	localStorage["lang"] = (localStorage["lang"] && localStorage["lang"].length == 2)?
		localStorage["lang"]:
		chrome.i18n.getUILanguage().substring(0, 2);
	var lang = localStorage["lang"];

	var a = $.getJSON("_locales/" + lang + "/messages.json").
		    done((x)=> { storage.set("localization", x);});
}

function phoneBookRemoveEntry(entry_id){
	if(!localStorage["phoneBookListId"]) return;
	if(is_too_fast()) return;
	console.log("Remove phonebook enrty %o", entry_id);
	var list_id = localStorage["phoneBookListId"];
	KAZOO.lists.deleteEntry({account_id: localStorage["account_id"],
				 success: updatePhoneBook,
				 list_id: list_id,
				 entry_id: entry_id
				});
}

function createPhoneBook(){
	if(is_too_fast(undefined, 60000)) return;
	console.log("Creating new phonebook");
	KAZOO.lists.addList({account_id: localStorage["account_id"],
			     success: updatePhoneBook,
			     error: (d,s)=>{ console.log("Can't create phonebook, response: %o", s.responseJSON); },
			     data:{ name: localStorage["username"] + "'s phone book" }});
}

function update_DND_ico(){
	chrome.runtime.sendMessage({
		sender: "KAZOO",
		type: "action",
		data: {action: "update_DND_icon"}
	}, ()=>{});
}

function update_CF_ico(){
	chrome.runtime.sendMessage({
		sender: "KAZOO",
		type: "action",
		data: {action: "update_CF_icon"}
	}, ()=>{});
}

function switchDND(){
	if(is_too_fast()){
		showError({statusText: "Too fast"});
		return;
	}
	localStorage.removeItem("dnd");
	update_DND_ico();
	KAZOO.user.get({userId: localStorage['user_id'], account_id: localStorage['account_id'],
			success: (data, status)=>{
				if(!(data.data.do_not_disturb && data.data.do_not_disturb.enabled)){
					data.data.do_not_disturb = {enabled: false};
				}
				data.data.do_not_disturb.enabled = !data.data.do_not_disturb.enabled;
				localStorage.dnd = data.data.do_not_disturb.enabled;
				KAZOO.user.update({data: data.data,
						   userId: localStorage['user_id'],
						   account_id: localStorage['account_id'],
						   success:(d, s)=>{
							   console.log("DND set to %o", d.data.do_not_disturb.enabled);
							   update_DND_ico(); },
						   error: (x)=>{
							   console.log("Error on update DND, %o", x);
							   update_DND_ico(); }
						  });
			},
			error: (x)=>{
				console.log("Error on get DND, %o", x);
				update_DND_ico();
			}});
}

function updatePhoneBook(){
	if(is_too_fast()) return;
	KAZOO.lists.getLists({account_id: localStorage["account_id"],
			      filters: {filter_name: localStorage["username"] + "'s phone book"},
			      success: (data, status)=>{
				      //var phone_book = data.data.find((x)=>{return ( x.name == (localStorage["username"] + "'s phone book"));});
				      var phone_book = data.data[0];
				      if (phone_book) {
					      localStorage["phoneBookListId"] = phone_book.id;
					      KAZOO.lists.getEntries({account_id: localStorage["account_id"], list_id: phone_book.id,
								      success:(d, s)=>{ storage.set("phone_book", d.data); },
								      error:  (d, s)=>{ console.log(MODULE + " Can't get entries! response: %o", s.status); }});
				      }else{
					      createPhoneBook();
				      }
			      }, error: (data, status)=>{
				      console.log("Update phoneBook error, code %o", status.status);
			      }});
}

function updateDevices(){
	if(is_too_fast()) return;
	KAZOO.device.list({
		account_id: localStorage["account_id"],
		filters: {filter_owner_id: localStorage.user_id},
		success: (data, status)=>{
			var new_devices = [];
			var devices = data.data;
			for(var device_num in devices) {
				new_devices.push({
					num: device_num,
					name: devices[device_num].name,
					id: devices[device_num].id
				});
			}
			storage.set("devices", new_devices);			
			localStorage["active_device"] = (localStorage["active_device"] && devices[localStorage["active_device"]])?
				localStorage["active_device"]: "auto";

			//get caller_number / caller_name
			var lazy_get_dev_info_functions = new_devices.map((dev)=>{
				return function(){
					KAZOO.device.get({
						account_id: localStorage["account_id"],
						deviceId: dev.id,
						success: (data, status)=>{
							var d = data.data;
							var external_name, external_number, internal_name, internal_number;
							var devices = storage.get("devices", []);
							var current_device_index = devices.findIndex((x)=>{return x.id===dev.id;});
							if (current_device_index >= 0) {
								try{ devices[current_device_index].external_caller_name = d.caller_id.external.name;	 }catch(e){}
								try{ devices[current_device_index].internal_caller_name = d.caller_id.internal.name;	 }catch(e){}
								try{ devices[current_device_index].external_caller_number = d.caller_id.external.number; }catch(e){}
								try{ devices[current_device_index].internal_caller_number = d.caller_id.internal.number; }catch(e){}

								storage.set("devices", devices);
							}
						},
						error: (x)=>{ console.log("Error getting "); }
					});
				};
			});
			executeWithDelay(lazy_get_dev_info_functions, 1500); //for prevent concurent writing to localStorage
		}});
};

function reloadTabs(){
	chrome.tabs.getAllInWindow((tabs)=>{
		tabs.forEach((tab)=>{
			if (!tab.url.startsWith("chrome")) {
				chrome.tabs.reload(tab.id);
			}
		});
	});
}

function contentLoaded() {
	prepareToStart();
	updateLocalization();
	if (!(localStorage["url"] && localStorage["username"] && localStorage["accname"] && localStorage["credentials"])){
		chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
		return;
	}

	var kazoosdk_options = {
		apiRoot: localStorage["url"] + "v2/",

		onRequestStart: function(request, requestOptions) {
			//console.log(MODULE + "Request started: %o", request);
		},
		onRequestEnd: function(request, requestOptions) {
			//console.log(MODULE + "Request started: %o", request);
		},
		onRequestError: function(error, requestOptions) {
			if(requestOptions.generateError !== false) {
				console.log(MODULE + " Request error: %o %o", error.status, error.status.text);
			}
			var error_count = incrementErrorCount(error.status);

			if (error.status == "401"){
				if (error_count < 3 && localStorage["connectionStatus"] === "signedIn") {
					window.setTimeout(authorize, 1500);	//attempt to reconnect
				}
			}
			
			showError(error);
		}
	};
	KAZOO = $.getKazooSdk(kazoosdk_options);

	authorize();
}

function prepareToStart(){	
	localStorage["connectionStatus"] = "signedOut";
	storage.maybe_set("errors", {});
	storage.maybe_set("vm_media", {});
	storage.maybe_set("vm_boxes", []);
	storage.maybe_set("history", []);
	storage.maybe_set("inboundCallNotificationsEnabled", true);
	storage.maybe_set("system_notification", true);
	storage.maybe_set("clicktodial", true);
	storage.maybe_set("pkg_dump", {"Call-Direction": "","Event-Name": ""});
	storage.maybe_set("custom_profile_page", "https://google.com/search?q={{Caller-ID-Name}}%20{{Caller-ID-Number}}");
	storage.maybe_set("active_device", "auto");
	storage.maybe_set("onNewFaxNotification", true);	
}

function incrementErrorCount(error_code){
	console.log(MODULE + " Error %o count increased", error_code);
	var errors = storage.get("errors", {});
	errors[error_code] = errors[error_code] || 0;
	errors[error_code] += 1;
	errors["last_modify"] = Date.now();
	window.setTimeout(()=>{
		if (! localStorage["errors"]) return;
		var errors = JSON.parse(localStorage["errors"]);
		if (Date.now() - errors["last_modify"] >= 5000) {
			delete(localStorage.errors);
		}
	}, 5000);
	localStorage["errors"] = JSON.stringify(errors);
	return errors[error_code];
}

function showError(data){
	chrome.runtime.sendMessage({
		sender: "KAZOO",
		type: "error",
		data: data
	}, ()=>{});
}

function authorize(){
	if(is_too_fast()) return;
	console.log(MODULE + " Start authorizing routines...");
	localStorage["connectionStatus"] = "inProgress";
	chrome.browserAction.setIcon({path: "images/logo_wait_128x128.gif"});
	KAZOO.auth.userAuth({
		data: {
			account_name: localStorage["accname"],
			method: "md5",
			credentials: localStorage["credentials"]
		},
		success: function(data, status) {
			console.log(MODULE + " Require user data...");
			localStorage["account_id"] = data.data.account_id;
			KAZOO.user.list({
				account_id: data.data.account_id,
				filters: { filter_username: localStorage["username"] },
				success: function(b_data, b_status) {
					localStorage["name"] = b_data.data[0].first_name + " " + b_data.data[0].last_name;
					localStorage["email"] = b_data.data[0].email;
					console.log(MODULE + " Auth completed, welcome ", localStorage["name"]);
					chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
					localStorage["connectionStatus"] = "signedIn";
					localStorage["errorMessage"]="";
					localStorage["authTokens"] = KAZOO.authTokens[Object.keys(KAZOO.authTokens)[0]];
					localStorage["user_id"] = b_data.data[0].id;
					executeWithDelay([getMyFaxBoxId
							  ,grubUserData
							  ,grubAccountData
							  ,updateDevices
							  ,updateVoiceMails
							  ,updatePhoneBook
							  ,signToBlackholeEvents
							  ,updateFax
							  ,updateHistory
							  ,update_DND_ico
							  ,update_CF_ico], 1200);

					clearInterval(AUTH_DAEMON_ID);
					clearInterval(VM_DAEMON_ID);
					clearInterval(FAX_DAEMON_ID);
					clearInterval(HISTORY_DAEMON_ID);
					AUTH_DAEMON_ID = window.setInterval(authorize, 60*60*1000); // update auth-token every hour
					VM_DAEMON_ID = window.setInterval(updateVoiceMails, 30*1000);
					FAX_DAEMON_ID = window.setInterval(updateFax, 60*1000);
					HISTORY_DAEMON_ID = window.setInterval(updateHistory, 60*1000);
				},
				error: error_handler
			});
		},
		error: error_handler,
		generateError: true
	});
}

function grubAccountData(){
	if(is_too_fast()) return;
	KAZOO.account.get({
		account_id: localStorage.account_id,
		success:(d, s)=> {
			try{
				storage.set("account_internal_caller_name", d.data.caller_id.internal.name);
			}catch(e){}
			try{
				storage.set("account_external_caller_name", d.data.caller_id.external.name);
			}catch(e){}
			try{
				storage.set("account_external_caller_number", d.data.caller_id.external.number);
			}catch(e){}
			try{
				storage.set("account_internal_caller_number", d.data.caller_id.internal.number);
			}catch(e){}
		},
		error:  (d, s)=>{ console.log("Error getting account's caller data"); }
	});
}

function grubUserData(){
	if(is_too_fast()) return;
	KAZOO.user.get({
		account_id: localStorage.account_id,
		userId: localStorage.user_id,
		success:(d, s)=> {
			if(!(d.data.do_not_disturb && d.data.do_not_disturb.enabled)){
				d.data.do_not_disturb = {enabled: false};
			}
			if(!(d.data.call_forward && d.data.call_forward.enabled)){
				d.data.call_forward = {enabled: false};
			}

			storage.set("call_forward", d.data.call_forward.enabled);
			storage.set("dnd", d.data.do_not_disturb.enabled);
			try{
				storage.set("user_internal_caller_name", d.data.caller_id.internal.name);
			}catch(e){}
			try{
				storage.set("user_external_caller_name", d.data.caller_id.external.name);
			}catch(e){}
			try{
				storage.set("user_external_caller_number", d.data.caller_id.external.number);
			}catch(e){}
			try{
				storage.set("user_internal_caller_number", d.data.caller_id.internal.number);
			}catch(e){}
		},
		error:  (d, s)=>{ console.log("Error getting user's caller data"); }
	});
}

function switch_call_forward(){
	if(is_too_fast()){
		showError({statusText: "Too fast" });
		return;
	}
	localStorage.removeItem("call_forward");
	update_CF_ico();
	KAZOO.user.get({
		account_id: localStorage.account_id,
		userId: localStorage.user_id,
		success:(data, status)=> {
			data = data.data;
			if(!(data.call_forward && data.call_forward.enabled)){
				data.call_forward = {enabled: false};
			}
			
			data.call_forward.enabled = !data.call_forward.enabled;
			KAZOO.user.update({
				account_id: localStorage.account_id,
				userId: localStorage.user_id,
				data: data,
				success:(d, s)=> {
					console.log("Call_forward set to %o",d.data.call_forward.enabled);
					storage.set("call_forward", d.data.call_forward.enabled);
					update_CF_ico();
				},
				error:  (d, s)=>{
					console.log("Error setting call_forward, %o", d);
					update_CF_ico();
				}
			});
		},
		error:  (d, s)=>{
			console.log("Error getting call_forward, %o", d);
			update_CF_ico();
		}
	});	
}

var last_blackhole_pkg = {};
function signToBlackholeEvents(){
	if(is_too_fast()) return;
	if (!(io && io.connect)) return;

	var blackholeUrl = localStorage.url.replace(/:[0-9]+\/$/, ":5555");
	SOCKET = io.connect(blackholeUrl);
	SOCKET.emit('subscribe', {
		account_id: localStorage.account_id,
		auth_token: localStorage.authTokens,
		binding: 'call.*.*'
        });

	// SOCKET.emit('subscribe', {
	// 	account_id: localStorage.account_id,
	// 	auth_token: localStorage.authTokens,
	// 	binding: 'fax.status.*' //<<"fax.status.", FaxId/binary>>, может передать faxid?
        // });

	function call_event_handler(EventJObj) {
		var devices = storage.get("devices", []).map((x)=>{return x.id;});
		if (is_too_fast(EventJObj["Event-Name"] + "_" + EventJObj["Call-Direction"]) ||
		    !EventJObj["Custom-Channel-Vars"]["Account-ID"] === localStorage["account_id"] ||	//FIXME(?)
		    devices.findIndex((x)=>{ return x == EventJObj["Custom-Channel-Vars"]["Authorizing-ID"];}) < 0) return;
		var number, in_phone_book_name, name;
		if (EventJObj["Event-Name"] === "CHANNEL_CREATE") {			
			storage.assign("pkg_dump", flatten(EventJObj));		// Dump blackhole package structure
			var is_outgoing = EventJObj["Call-Direction"] === "inbound";
			last_blackhole_pkg = EventJObj;
			number = is_outgoing? (EventJObj["Callee-ID-Number"] || EventJObj["To"].split('@')[0]):
				    (EventJObj["Caller-ID-Number"] || EventJObj["Other-Leg-Caller-ID-Number"] || EventJObj["From"].split('@')[0] || "unknown");
			in_phone_book_name = storage.get("phone_book", []).find((x)=>{return (x.value && x.value.phone == number);});
			if(in_phone_book_name && in_phone_book_name.value && in_phone_book_name.value.name) in_phone_book_name = in_phone_book_name.value.name;
			name = is_outgoing? (EventJObj["Callee-ID-Name"] || EventJObj["To"].split('@')[0]):
				(EventJObj["Caller-ID-Name"] || EventJObj["Other-Leg-Caller-ID-Name"] || EventJObj["From"].split('@')[0] ||"unknown");
			if(is_outgoing && localStorage.outboundCallNotificationsEnabled !== "true") return;
			if(!is_outgoing && localStorage.inboundCallNotificationsEnabled !== "true") return;
			if(EventJObj["Caller-ID-Name"] === "Device QuickCall" && localStorage.onQuickCallNotifications !== "true") return;

			if(!is_outgoing && localStorage.system_notification === "true"){
				chrome.notifications.create("Kazoo chrome extension push event", {
					type: "basic",
					iconUrl: "images/phone-push.png",
					title: "Incoming Call",
					isClickable: true,
					buttons: [{title:"View profile info"}, {title: "Call forward"}],
					message: "User " + (in_phone_book_name? (in_phone_book_name + " (" + name + ")") : name) + " calling",
					contextMessage: number
				}, ()=>{});
				chrome.notifications.onClicked.addListener((id)=>{
					if(id !== "Kazoo chrome extension push event") return;
					blackholeUserActionHandler("VIEW_PROFILE");
				});
				chrome.notifications.onButtonClicked.addListener((id, b_idx)=>{
					if(id !== "Kazoo chrome extension push event") return;
					if (b_idx === 0) {
						//alert("Coming soon");
					}else{
						//alert("Coming soon");
					}
				});
			}
			console.log(is_outgoing?"Outgoing":"Incoming" + " call event CHANNEL_CREATE from %o %o", name, number);
		}

		if (EventJObj["Event-Name"] === "CHANNEL_DESTROY"){
			console.log("Call event CHANNEL_DESTROY");
			chrome.notifications.clear("Kazoo chrome extension push event");
			window.setTimeout(updateHistory, 3000);
		}
		

		if (!is_too_fast("send_" + EventJObj["Event-Name"])){
			chrome.tabs.query({active: true}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					sender: "KAZOO",
					type: "event",
					data: {
						number: number,
						in_phone_book_name: in_phone_book_name,
						name: name,
						"Event-Name": EventJObj["Event-Name"],
						"Call-Direction": EventJObj["Call-Direction"]
					}
				}, ()=>{});
			});
		}
	}


	function fax_event_handler(EventJObj){
		// if(is_too_fast()) return;
		// if(EventJObj.data["FaxBox-ID"] !== localStorage.faxbox_id) return;
		// if(EventJObj.data["Direction"] !== "incoming") return;
		// if(EventJObj.data["Status"] !== "Fax Successfuly received") return;
		// //if(EventJObj.data["Fax-State"] !== "receive") return;
		// updateFax();

		// if(localStorage.fax_system_notification === "true"){
		// 	chrome.notifications.create("Kazoo chrome extension fax event", {
		// 		type: "basic",
		// 		iconUrl: "images/phone-push.png",
		// 		title: "Received fax",
		// 		isClickable: false,
		// 		buttons: [],
		// 		message: "Received fax from " + EventJObj.data["Caller-ID-Name"],
		// 		contextMessage: EventJObj.data["Caller-ID-Number"]
		// 	}, ()=>{});
		// }
	}

	function conference_event_handler(EventJObj){
		if(is_too_fast()) return;

		if(localStorage.conerence_system_notification === "true"){
			// chrome.notifications.create("Kazoo chrome extension conference event", {
			// 	type: "basic",
			// 	iconUrl: "images/phone-push.png",
			// 	title: "Received fax",
			// 	//eventTime: 2000,
			// 	isClickable: true,
			// 	buttons: [{title:"View"}, {title: "Cancel"}],
			// 	message: "Received fax from " + EventJObj.data.name,
			// 	contextMessage: EventJObj.data.number
			// }, ()=>{});
		}
	}


	SOCKET.on('CHANNEL_CREATE', call_event_handler);
	SOCKET.on('CHANNEL_ANSWER', call_event_handler);
	SOCKET.on('CHANNEL_DESTROY', call_event_handler);
	//SOCKET.on("status", fax_event_handler);                             	//TODO: Test it
	//SOCKET.on('participants_event', conference_event_handler);            	//TODO: Test it
}


function error_handler(data, status){
	console.log(MODULE + " Error: %o", status.error);
	chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
	localStorage["connectionStatus"]= "authFailed";
	localStorage.removeItem('credentials');
	localStorage["errorMessage"] = status.responseText;

	remove_workers();
	//contentLoaded();
}

function updateVoiceMails(){
	if(is_too_fast()) return;
	KAZOO.voicemail.list({
		filters: { filter_owner_id: localStorage["user_id"] },
		account_id: localStorage["account_id"],
		success: (data, status)=> {
			data.data.map((box)=>{
				KAZOO.voicemail.get({
					account_id: localStorage["account_id"],
					voicemailId: box.id,
					// filters: { created_from: last_time_update_time },	//TODO: May simplify code
					success: (box_data, box_status)=> {
						var msg_list = storage.get("vm_media", {});
						msg_list[box.id] = box_data.data;
						storage.set("vm_media", msg_list);
					}
				});
			});

			var box_list = storage.get("vm_boxes", []);
			var new_boxes = data.data.map((x_new)=>{
				x_new.old = true;
				try{
					var new_message_received = (box_list.filter((x_old)=>{return (x_new.id == x_old.id);})[0].messages < x_new.messages);
					if (new_message_received) {
						x_new.old = false;
						chrome.browserAction.setIcon({path: "images/mail_ico256.png"});
					}
				}catch(e){
					x_new.old = false;
				}
				return x_new;
			});
			storage.set("vm_boxes", new_boxes);
		}});
}

function blackholeUserActionHandler(action){
	console.log("Blackhole user action: %o", action);
	switch(action){
	case "KEEP_CALL":
		//alert("Keep call; now this features isn't implemented");
		break;

	case "CALL_FORWARDING":
		//alert("Call forwarding; now this features isn't implemented");
		break;

	case "OVERLAY":
		//alert("Overlay");
		break;

	case "REJECT":
		//alert("Rejected");
		break;

	case "VIEW_PROFILE":
		var newURL = substitute(localStorage["custom_profile_page"], flatten(last_blackhole_pkg));
		chrome.tabs.create({ url: newURL });
		break;

	default:
		showError({statusText: "Cannot execute command", status: ""});
		console.log(MODULE + " Unknown action from content-script: %o", action);
	}
}

function substitute(str, data){
	for(var replaceable in data){
		str = str.replace(new RegExp("{{" + replaceable + "}}", 'g'), data[replaceable]);
	}

	return str;
}

function gentlyOpenPage(url){
	var local_url = chrome.extension.getURL(url);
	chrome.tabs.query({url: local_url}, (x)=>{
		var activate_tab = x.pop();
		if (activate_tab) {
			chrome.tabs.highlight({tabs: activate_tab.index});
			chrome.tabs.remove(x.map((t)=>{ return t.id;}), ()=>{});
		}else{
			chrome.tabs.create({url: local_url});
		}
	});
}

function remove_workers(){
	KAZOO = {};
	SOCKET = {};
	clearInterval(AUTH_DAEMON_ID);
	clearInterval(VM_DAEMON_ID);
	clearInterval(FAX_DAEMON_ID);
	clearInterval(HISTORY_DAEMON_ID);
}

function updateHistory(){
	if(is_too_fast(undefined, 5000)) return;
	KAZOO.cdrs.listByUser({account_id: localStorage.account_id,
			       userId: localStorage.user_id,
			       filters: { created_from: storage.get("last_history_update", 63633113191) },
			       success: (d, s)=>{
				       if(d.data.length === 0) return;
				       console.log("%o history records received", d.data.length);
				       var old_history = storage.get("history", []);
				       d.data.sort((a, b)=> {
					       a = Number.parseInt(a.timestamp);
					       b = Number.parseInt(b.timestamp);
					       return a - b;
				       }).filter((record)=>{
					       return old_history.findIndex((x)=>{return x.id === record.id;}) === -1;   //only records, that don't contains in history
				       }).forEach((record)=>{
					       var is_outgoing = record.direction === "inbound";
					       var number = (is_outgoing? record.dialed_number: record.callee_id_number) || "unknown";
					       var in_phone_book_name = storage.get("phone_book", []).find((x)=>{return (x.value && x.value.phone == number);});
					       if(in_phone_book_name && in_phone_book_name.value && in_phone_book_name.value.name) in_phone_book_name = in_phone_book_name.value.name;
					       var name = (is_outgoing? record.callee_id_name: record.caller_id_name) || "unknown";
					       storage.unshift("history", {
						       number: number,
						       time: record.datetime,
						       type: is_outgoing? "outgoing":"incoming",
						       name: in_phone_book_name? (in_phone_book_name + " (" + name + ")") : name,
						       id: record.id
					       });
				       });
				       storage.set("last_history_update", Number.parseInt(d.data[d.data.length-1].timestamp) + 15); // 15s it is threshold for no-receiving
				       // that record again (may dont work)
			       },
			       error: (d, s)=>{
				       console.log("Error updateHistory: %o", d);
			       }});
}

chrome.extension.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', contentLoaded);
chrome.contextMenus.removeAll();
chrome.contextMenus.create({
	onclick: (a,b)=>{
		if(a.mediaType == "image"){

		}else{
			var text = a.selectionText;
			var re = new RegExp(/(?:^| )(?!(?:[0-3]?\d([- ])[0-3]?\d\1\d{2,4})|(?:\d{2,4}([- ])[0-3]?\d\2[0-3]?\d) )((?:[+]?\d{1,3}([- ]?))[(]?\d{2,4}[)]?\4\d{2,5}(-|\4?)\d{2,5}(?:\5\d{2,5}){0,2})(?: |$|.|,)/);

			var localization = storage.get("localization", {});
			var phone = text.match(re);
			if (phone) {
				var ph = phone[3] || phone[0];
				var name = prompt(localization.get_owner_name.message + " " + ph, localization.anonymous.message);
				if (name) {
					phoneBookAddEntry({name:name, phone:ph});
				}
			} else {
				alert(localization.cant_parse_number.message + " :(");
			}
		}
	},
	id: "add_phone",
	title:"Add to phonebook",
	contexts: ["selection"]
});
chrome.runtime.onInstalled.addListener((details)=>{
	reloadTabs();
});
