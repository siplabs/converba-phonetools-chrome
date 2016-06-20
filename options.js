if (localStorage["connectionStatus"] != "signedIn") {
	chrome.tabs.update({url: chrome.extension.getURL("sign.html")});
}

function main(){
	create_fields();	
	restore_options();
	$('#save_btn').click(save_options);
	$('#reset_btn').click(restore_options);
	$('#clean_history_btn').click(clean_history);
	localize();
}

function clean_history(){
	storage.set("history", []);
}

function localize(){
	var dictionary = storage.get("localization", {});

	$("#lang_text").text(dictionary["lang"].message);
	$("#device_text").text(dictionary["device_selection"].message);
	$("#behavior_text").text(dictionary["behavior"].message);
	$("#inboundCallNotificationsEnabled").text(dictionary["inboundCallNotificationsEnabled"].message);
	$("#outboundCallNotificationsEnabled").text(dictionary["outboundCallNotificationsEnabled"].message);
	$("#system_notification").text(dictionary["system_notification"].message);
	$("#onQuickCallNotifications").text(dictionary["onQuickCallNotifications"].message);
	$("#invitation_to_customize_viewers_url").text(dictionary["invitation_to_customize_viewers_url"].message);
	$("#supported_params_text").text(dictionary["supported_params_text"].message);
	$("#clicktodial_text").text(dictionary["clicktodial_text"].message);
	$("#customize_viewer_text").text(dictionary["customize_viewer_text"].message);
	$("#other").text(dictionary["other"].message);
	$("#save_btn").attr("value", dictionary["save"].message);
	$("#reset_btn").attr("value", dictionary["reset"].message);
	$("#clean_history_btn").attr("value", dictionary["clean_history"].message);
	$("#onNewFaxNotification_text").text(dictionary["onNewFaxNotification"].message);
}

function save_options(){
	var options = $('form[name=Options]').serializeArray().reduce((obj, item)=>{
		obj[item.name] = item.value;
		return obj;
	}, {});
	storage.set("lang", options["lang"]);
	storage.set("active_device", options["active_device"]);
	storage.set("inboundCallNotificationsEnabled", options["inboundCallNotificationsEnabled"] === "on");
	storage.set("outboundCallNotificationsEnabled", options["outboundCallNotificationsEnabled"] === "on");
	storage.set("system_notification", options["system_notification"] === "on");
	storage.set("onQuickCallNotifications", options["onQuickCallNotifications"] === "on");
	storage.set("clicktodial", options["clicktodial"] === "on");
	storage.set("custom_profile_page", options["custom_profile_page"]);
	storage.set("onNewFaxNotification", options["onNewFaxNotification"]);

	chrome.runtime.sendMessage({ type : "UPDATE_LOCALIZATION"}, ()=>{
		chrome.tabs.reload();
	});
}

function create_fields(){
	var opt = document.forms["Options"];
	get_devices().forEach((device)=>{
		opt.elements["devices_list"].appendChild(device);
	});
}

function restore_options(){
	var opt = document.forms["Options"];
	opt.elements["lang"].value = storage.get("lang", "en");
	opt.elements["active_device"].value =storage.get("active_device", "auto");
	opt.elements["inboundCallNotificationsEnabled"].checked = storage.get("inboundCallNotificationsEnabled", false);
	opt.elements["outboundCallNotificationsEnabled"].checked = storage.get("outboundCallNotificationsEnabled", false);
	opt.elements["system_notification"].checked = storage.get("system_notification", false);
	opt.elements["onQuickCallNotifications"].checked = storage.get("onQuickCallNotifications", false);
	opt.elements["clicktodial"].checked = storage.get("clicktodial", false);
	opt.elements["custom_profile_page"].value = storage.get("custom_profile_page", "");
	opt.elements["onNewFaxNotification"].checked = storage.get("onNewFaxNotification", true);
}

function get_devices(){
	var devices = storage.get("devices", {});
	var p, input, result_list = [];
	for(var i in devices) {
		p = document.createElement("div");
		$(p).attr("class", "settings__item");
		input = document.createElement("INPUT");
		input.type = "radio";
		input.name = "active_device";
		input.value= devices[i].id;
		p.appendChild(input);
		p.innerHTML += devices[i].name;
		result_list.push(p);
	}
	return result_list;
}

document.addEventListener('DOMContentLoaded', main);
