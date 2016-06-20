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
document.addEventListener('DOMContentLoaded', ()=>{
	document.querySelector('#about_ok_button').addEventListener('click', ()=>{
		if (localStorage["currentTab"] == "sign"){
			top.location.assign("sign.html");
		}
		else{
			top.location.assign("tabs.html");
		}
	});
	localize();
});

function localize(){
	try{
		var x = JSON.parse(localStorage["localization"]);
		document.querySelector("#about_label").innerText = capitalizeString(x.about.message);
	}catch(e){ console.log("Translating error"); }
}

function capitalizeString(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
