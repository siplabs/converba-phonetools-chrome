(function(){
	if (localStorage["connectionStatus"] != "signedIn")
		chrome.tabs.update({url: chrome.extension.getURL("sign.html")});

	var dictionary = storage.get("localization", {});
	
	function main(){
		createDropdownMenu();
		$("#send_btn").click(send);
		localize();
	}

	function createDropdownMenu(){
		var select  = $("#caller_id")[0];
		var accountOpt = document.createElement("option");
		accountOpt.value = "account";
		accountOpt.text = "Account: " + localStorage["account_external_caller_name"];
		accountOpt.disabled = storage.get("account_external_caller_name", "undefined") == "undefined" ||
			storage.get("account_external_caller_number", "undefined") == "undefined";

		var userOpt = document.createElement("option");
		userOpt.value = "user";
		userOpt.text = "User: " + localStorage["user_external_caller_name"];
		userOpt.disabled = storage.get("user_external_caller_name", "undefined") == "undefined" ||
			storage.get("user_external_caller_number", "undefined") == "undefined";

		storage.get("devices", []).forEach((device)=>{
			var deviceOpt = document.createElement("option");
			deviceOpt.value = device.num;
			deviceOpt.text = device.name + " (" + device.external_caller_name + ")";
			deviceOpt.disabled = !(device.external_caller_name && device.external_caller_number);
			select.add(deviceOpt);
		});
		
		select.add(accountOpt);
		select.add(userOpt);
	}

	function localize(){
		$("#title").text(dictionary["fax_send"].message);
		$("#attachment").attr("placeholder", dictionary["attachment_url"].message);
		$("#to_name").attr("placeholder", dictionary["to_name"].message);
		$("#to_number").attr("placeholder", dictionary["to_number"].message);
		$("#send_btn").attr("value", dictionary["send"].message);
		$("#reset_btn").attr("value", dictionary["reset"].message);
	}

	function send(){
		var options = $('form[name=Options]').serializeArray().reduce((obj, item)=>{
			if(!item.value && !obj["failed"]){
				showMessage(true, $("#" + item.name).attr("placeholder") + " required");
				obj["failed"] = true;
			}
			obj[item.name] = item.value;
			return obj;
		}, {type: "SEND_FAX" });

		if(!options.failed){
			chrome.runtime.sendMessage(options, (e)=>{
				showMessage(e);
				$("#attachment")[0].value = "";
				$("#to_name")[0].value = "";
				$("#to_number")[0].value = "";
			});
		}
	}

	function showMessage(is_error, text) {
		$("#error_msg2").text(text || dictionary[ is_error?"failed":"success" ].message);
		$("#error_msg2")[0].style.color = is_error? "red": "green";
		$("#error_msg2").fadeIn();
		$("#error_msg2").fadeOut(5000);
	}

	document.addEventListener("DOMContentLoaded", main);
})();
