(function() {
	if (localStorage["connectionStatus"] != "signedIn")
		chrome.tabs.update({url: chrome.extension.getURL("sign.html")});

	var dictionary = storage.get("localization", {});

	function main(){
		$("#save_btn").click(save_options);
		$("#birthday").focus(function() {
			this.type = "date";
		}).blur(function() {
			this.type = "text";
		});
		localize();
	}

	function localize(){
		$("#title").text(dictionary["pb_title"].message);
		$("#info").text(dictionary["info"].message);
		$("#first_name").attr("placeholder", dictionary["first_name"].message);
		$("#last_name").attr("placeholder", dictionary["last_name"].message);
		$("#birthday").attr("placeholder", dictionary["birthday"].message);
		$("#phone").attr("placeholder", dictionary["tel"].message);
		$("#email").attr("placeholder", dictionary["email"].message);
		$("#address").attr("placeholder", dictionary["address"].message);
		$("#save_btn").attr("value", dictionary["save"].message);
		$("#reset_btn").attr("value", dictionary["reset"].message);
	}

	function save_options(){
		var options = $('form[name=Options]').serializeArray().reduce((obj, item)=>{
			obj[item.name] = item.value;
			return obj;
		}, {type: "PHONE_BOOK_ADD_ENTRY"});
		!(options.name || options.last_name)? showMessage(true, "Name required"):
			!options.phone? showMessage(true, "Phone required"):
			chrome.runtime.sendMessage(options, (e)=>{
				showMessage(e);
				$("#first_name").val("");
				$("#last_name").val("");
				$("#birthday").val("");
				$("#phone").val("");
				$("#email").val("");
				$("#address").val("");
			});
	}

	function showMessage(is_error, text) {
		$("#error_msg2").text(text || dictionary[ is_error?"failed":"success" ].message);
		$("#error_msg2")[0].style.color = is_error? "red": "green";
		$("#error_msg2").fadeIn();
		$("#error_msg2").fadeOut(5000);
	}

	
	document.addEventListener("DOMContentLoaded", main);
})();
