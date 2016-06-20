/*
 Changed by SIPLABS LLC, 2016.

 The Kazoo javascript SDK is a jQuery plugin that allows 
 you to easily call an extensive list of APIs from Kazoo.
 */

(function ( $ ) {
	var baseMethods = {
		auth: {
			pinAuth: function(settings) {
				authFunction(settings, this.parent.defaultSettings, 'pin_auth');
			},
			sharedAuth: function(settings) {
				authFunction(settings, this.parent.defaultSettings, 'shared_auth');
			},
			userAuth: function(settings) {
				authFunction(settings, this.parent.defaultSettings, 'user_auth');
			}
		}
	},
	methodsGenerator = {
		account: {
			'get': { verb: 'GET', url: 'accounts/{account_id}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}' },
			'update': { verb: 'POST', url: 'accounts/{account_id}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}' },
			'listDescendants': { verb: 'GET', url: 'accounts/{account_id}/descendants' },
			'listChildren': { verb: 'GET', url: 'accounts/{account_id}/children' },
			'listParents': { verb: 'GET', url: 'accounts/{account_id}/tree' },
			'searchByName': { verb: 'GET', url: 'search?t=account&q=name&v={accountName}'},
			'searchAll': { verb: 'GET', url: 'search/multi?t=account&by_name={searchValue}&by_realm={searchValue}&by_id={searchValue}'}
		},
		lists: {
			'getLists': { verb: 'GET', url: 'accounts/{account_id}/lists'},
			'getListProp': { verb: 'GET', url: 'accounts/{account_id}/lists/{list_id}'},
			'addList': { verb: 'PUT', url: 'accounts/{account_id}/lists'},
			'replaceList': { verb: 'POST', url: 'accounts/{account_id}/lists'}, //Error: 405 (Method Not Allowed)
			//'updateList': { verb: 'PATCH', url: 'accounts/{account_id}/lists'}, //Error: 405 (Method Not Allowed)
			'deleteList': { verb: 'DELETE', url: 'accounts/{account_id}/lists/{list_id}'},
			'purgeList': { verb: 'DELETE', url: 'accounts/{account_id}/lists/{list_id}/entries'},
			'addEntry': { verb: 'PUT', url: 'accounts/{account_id}/lists/{list_id}/entries'},
			'getEntries': { verb: 'GET', url: 'accounts/{account_id}/lists/{list_id}/entries'},
			'getEntryProp': { verb: 'GET', url: 'accounts/{account_id}/lists/{list_id}/entries/{entry_id}'},
			//'replaceEntry': { verb: 'POST', url: 'accounts/{account_id}/lists/{list_id}/entries/{entry_id}'}, //Error: 400 (Bad Request)
			'updateEntry': { verb: 'PATCH', url: 'accounts/{account_id}/lists/{list_id}/entries/{entry_id}'},
			'deleteEntry': { verb: 'DELETE', url: 'accounts/{account_id}/lists/{list_id}/entries/{entry_id}'},
			'getEntryVcard': { verb: 'GET', url: 'accounts/{account_id}/lists/{list_id}/entries/{entry_id}/vcard'},
			'addPhotoToListEntry': { verb: 'POST', url: 'accounts/{account_id}/lists/{list_id}/entries/{entry_id}/photo'}
		},
		appsStore: {
			'get': { verb: 'GET', 'url': 'accounts/{account_id}/apps_store/{appId}' },
			'list': { verb: 'GET', 'url': 'accounts/{account_id}/apps_store' },
			'getIcon': { verb: 'GET', 'url': 'accounts/{account_id}/apps_store/{appId}/icon', dataType: 'text' },
			'update': { verb: 'POST', 'url': 'accounts/{account_id}/apps_store/{appId}' },
			'add': { verb: 'PUT', 'url': 'accounts/{account_id}/apps_store/{appId}' },
			'delete': { verb: 'DELETE', 'url': 'accounts/{account_id}/apps_store/{appId}' },
			'getBlacklist': { verb: 'GET', 'url': 'accounts/{account_id}/apps_store/blacklist' },
			'updateBlacklist': { verb: 'POST', 'url': 'accounts/{account_id}/apps_store/blacklist' }
		},
		auth: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/user_auth/{token}' },
			'recovery': { verb: 'PUT', url: 'user_auth/recovery' }
		},
		balance: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/transactions/current_balance' },
			'getMonthly': { verb: 'GET', url: 'accounts/{account_id}/transactions/monthly_recurring?created_from={from}&created_to={to}' },
			'getCharges': { verb: 'GET', url: 'accounts/{account_id}/transactions?created_from={from}&created_to={to}&reason={reason}' },
			'getSubscriptions': { verb: 'GET', url: 'accounts/{account_id}/transactions/subscriptions' },
			'filtered': { verb: 'GET', url: 'accounts/{account_id}/transactions?created_from={from}&created_to={to}&reason={reason}' },
			'add': { verb: 'PUT', url: 'accounts/{account_id}/braintree/credits' },
			'remove': { verb: 'DELETE', url: 'accounts/{account_id}/transactions/debit'}
		},
		billing: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/braintree/customer' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/braintree/customer' }
		},
		callflow: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/callflows/{callflowId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/callflows' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/callflows/{callflowId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/callflows/{callflowId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/callflows' },
			'searchByNameAndNumber': { verb: 'GET', url: 'accounts/{account_id}/search?t=callflow&q=name_and_number&v={value}'},
			'searchByNumber': { verb: 'GET', url: 'accounts/{account_id}/search?t=callflow&q=number&v={value}'}
		},
		cdrs: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/cdrs/{cdrId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/cdrs' },
			'listByUser': { verb: 'GET', url: 'accounts/{account_id}/users/{userId}/cdrs'}
		},
		channel: {
			'list': { verb: 'GET', url: 'accounts/{account_id}/channels' }
		},
		clickToCall: {
			'create': { verb: 'PUT', url: 'accounts/{account_id}/clicktocall' },
			'get': { verb: 'GET',  url: 'accounts/{account_id}/clicktocall/{clickToCallId}' },
			'update': { verb: 'GET', url: 'accounts/{account_id}/clicktocall/{clickToCallId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/clicktocall/{clickToCallId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/clicktocall' },
			'connect': { verb: 'POST', url: 'accounts/{account_id}/clicktocall/{clickToCallId}/connect' }
		},
		conference: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/conferences/{conferenceId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/conferences' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/conferences/{conferenceId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/conferences' },
			'getPins': { verb: 'GET', url: 'accounts/{account_id}/conferences/pins' },
			'view': { verb: 'GET', url: 'accounts/{account_id}/conferences/{conferenceId}/status' },
			'action': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/{action}' },

			'getServer': { verb: 'GET', url: 'accounts/{account_id}/conferences_servers/{serverId}' },
			'createServer': { verb: 'PUT', url: 'accounts/{account_id}/conferences_servers' },
			'updateServer': { verb: 'POST', url: 'accounts/{account_id}/conferences_servers/{serverId}' },
			'deleteServer': { verb: 'DELETE', url: 'accounts/{account_id}/conferences_servers/{serverId}' },
			'listServers': { verb: 'GET', url: 'accounts/{account_id}/conferences_servers' },

			'addParticipant': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/add_participant' },
			'muteParticipant': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/mute/{participantId}' },
			'unmuteParticipant': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/unmute/{participantId}' },
			'deafParticipant': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/deaf/{participantId}' },
			'undeafParticipant': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/undeaf/{participantId}' },
			'kickParticipant': { verb: 'POST', url: 'accounts/{account_id}/conferences/{conferenceId}/kick/{participantId}' },

			'createNotification': { verb: 'PUT', url: 'accounts/{account_id}/notify/conference_{notificationType}', type: 'text/html', dataType: 'text/html' },
			'getNotification': { verb: 'GET', url: 'accounts/{account_id}/notify/conference_{notificationType}/{contentType}', type: 'text/html', dataType: 'text/html' },
			'updateNotification': { verb: 'POST', url: 'accounts/{account_id}/notify/conference_{notificationType}', type: 'text/html', dataType: 'text/html' }
		},
		connectivity: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/connectivity/{connectivityId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/connectivity' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/connectivity/{connectivityId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/connectivity' }
		},
		contactList: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/contact_list' }
		},
		device: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/devices/{deviceId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/devices' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/devices/{deviceId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/devices/{deviceId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/devices' },
			'getStatus': { verb: 'GET', url: 'accounts/{account_id}/devices/status' },
			'quickcall': { verb: 'GET', url: 'accounts/{account_id}/devices/{deviceId}/quickcall/{number}'},
			'restart': { verb: 'POST', url: 'accounts/{account_id}/devices/{deviceId}/sync'},
			'updatePresence': { verb: 'POST', url: 'accounts/{account_id}/device/{deviceId}/presence' }
		},
		directory: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/directories/{directoryId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/directories' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/directories/{directoryId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/directories/{directoryId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/directories' }
		},
		faxbox: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/faxboxes/{faxboxId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/faxboxes/' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/faxboxes/{faxboxId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/faxboxes/{faxboxId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/faxboxes/' }
		},
		faxes: {
			'getLogs': { verb: 'GET', url: 'accounts/{account_id}/faxes/smtplog'},
			'getLogDetails': { verb: 'GET', url: 'accounts/{account_id}/faxes/smtplog/{logId}'},
			'send': {verb: 'PUT', url: 'accounts/{account_id}/faxes/'},
			'incoming': {verb: 'GET', url: 'accounts/{account_id}/faxes/incoming'},
			'receive': {verb: 'GET', url: 'accounts/{account_id}/faxes/incoming/{fax_id}/attachment'},
			'outgoing': {verb: 'GET', url: 'accounts/{account_id}/faxes/outgoing'}
		},
		globalResources: {
			'get': { verb: 'GET', url: 'resources/{resourceId}' },
			'create': { verb: 'PUT', url: 'resources' },
			'update': { verb: 'POST', url: 'resources/{resourceId}' },
			'delete': { verb: 'DELETE', url: 'resources/{resourceId}' },
			'list': { verb: 'GET', url: 'resources' },
			'updateCollection': { verb: 'POST', url: 'resources/collection' },
			'listJobs': { verb: 'GET', url: 'resources/jobs' },
			'getJob': { verb: 'GET', url: 'resources/jobs/{jobId}' },
			'createJob':  { verb: 'PUT', url: 'resources/jobs' }
		},
		group: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/groups/{groupId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/groups' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/groups/{groupId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/groups/{groupId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/groups' }
		},
		inspector: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/call_inspector/{callId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/call_inspector' }
		},
		ips: {
			'add': { verb: 'POST', url: 'accounts/{account_id}/ips/{ip}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/ips/{ip}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/ips?zone={zone}&quantity={quantity}' },
			'listAssigned': { verb: 'GET', url: 'accounts/{account_id}/ips/assigned' },
			'listZones': { verb: 'GET', url: 'accounts/{account_id}/ips/zones' }
		},
		limits: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/limits' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/limits' }
		},
		localResources: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/resources/{resourceId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/resources' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/resources/{resourceId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/resources/{resourceId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/resources' },
			'updateCollection': { verb: 'POST', url: 'accounts/{account_id}/resources/collection' },
			'listJobs': { verb: 'GET', url: 'accounts/{account_id}/resources/jobs' },
			'getJob': { verb: 'GET', url: 'accounts/{account_id}/resources/jobs/{jobId}' },
			'createJob':  { verb: 'PUT', url: 'accounts/{account_id}/resources/jobs' }
		},
		media: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/media/{mediaId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/media' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/media/{mediaId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/media/{mediaId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/media' },
			'upload': { verb: 'POST', url: 'accounts/{account_id}/media/{mediaId}/raw', type: 'application/x-base64' }
		},
		menu: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/menus/{menuId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/menus' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/menus/{menuId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/menus/{menuId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/menus' }
		},
		numbers: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/phone_numbers/{phoneNumber}' },
			'activate': { verb: 'PUT', url: 'accounts/{account_id}/phone_numbers/{phoneNumber}/activate' },
			'activateBlock': { verb: 'PUT', url: 'accounts/{account_id}/phone_numbers/collection/activate' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/phone_numbers/{phoneNumber}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/phone_numbers/{phoneNumber}' },
			'deleteBlock': { verb: 'DELETE', url: 'accounts/{account_id}/phone_numbers/collection' },
			'identify': { verb: 'GET', url: 'accounts/{account_id}/phone_numbers/{phoneNumber}/identify' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/phone_numbers?filter_state=in_service' },
			'listAll': { verb: 'GET', url: 'accounts/{account_id}/phone_numbers' },
			'listClassifiers': { verb: 'GET', url: 'accounts/{account_id}/phone_numbers/classifiers' },
			'matchClassifier': { verb: 'GET', url: 'accounts/{account_id}/phone_numbers/classifiers/{phoneNumber}' },
			'search': { verb: 'GET', url: 'phone_numbers?prefix={pattern}&quantity={limit}&offset={offset}' },
			'searchBlocks': { verb: 'GET', url: 'phone_numbers?prefix={pattern}&quantity={size}&offset={offset}&blocks={limit}' },
			'searchCity': { verb: 'GET', url: 'phone_numbers/prefix?city={city}' },
			'sync': { verb: 'POST', url: 'accounts/{account_id}/phone_numbers/fix' }
		},
		pivot: {
			'listDebug': { verb: 'GET', url: 'accounts/{account_id}/pivot/debug' },
			'getDebug': { verb: 'GET', url: 'accounts/{account_id}/pivot/debug/{callId}' }
		},
		port: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/port_requests/{portRequestId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/port_requests' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/port_requests/{portRequestId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/port_requests/{portRequestId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/port_requests' },
			'listByState': { verb: 'GET', url: 'accounts/{account_id}/port_requests/{state}' },
			'listDescendants': { verb: 'GET', url: 'accounts/{account_id}/descendants/port_requests' },
			'listDescendantsByState': { verb: 'GET', url: 'accounts/{account_id}/descendants/port_requests/{state}' },
			'listAttachments': { verb: 'GET', url: 'accounts/{account_id}/port_requests/{portRequestId}/attachments' },
			'getAttachment': { verb: 'GET', url: 'accounts/{account_id}/port_requests/{portRequestId}/attachments/{documentName}', type: 'application/pdf' },
			'createAttachment': { verb: 'PUT', url: 'accounts/{account_id}/port_requests/{portRequestId}/attachments?filename={documentName}', type: 'application/pdf' },
			'updateAttachment': { verb: 'POST', url: 'accounts/{account_id}/port_requests/{portRequestId}/attachments/{documentName}', type: 'application/pdf' },
			'deleteAttachment': { verb: 'DELETE', url: 'accounts/{account_id}/port_requests/{portRequestId}/attachments/{documentName}', type: 'application/pdf' },
			'changeState': { verb: 'PATCH', url: 'accounts/{account_id}/port_requests/{portRequestId}/{state}' },
			'listComments': { verb: 'GET', url: 'accounts/{account_id}/port_requests/{portRequestId}/comments' },
			'getComment': { verb: 'GET', url: 'accounts/{account_id}/port_requests/{portRequestId}/comments/{commentId}' },
			'addComment': { verb: 'PUT', url: 'accounts/{account_id}/port_requests/{portRequestId}/comments' },
			'updateComment': { verb: 'POST', url: 'accounts/{account_id}/port_requests/{portRequestId}/comments/{commentId}' },
			'deleteComment': { verb: 'DELETE', url: 'accounts/{account_id}/port_requests/{portRequestId}/comments/{commentId}' },
			'deleteAllComments': { verb: 'DELETE', url: 'accounts/{account_id}/port_requests/{portRequestId}/comments' },
			'searchNumber': { verb: 'GET', url: 'accounts/{account_id}/port_requests?by_number={number}' },
			'searchNumberByDescendants': { verb: 'GET', url: 'accounts/{account_id}/descendants/port_requests?by_number={number}' }
		},
		presence: {
			'list': { verb: 'GET', url: 'accounts/{account_id}/presence' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/presence/{presenceId}' }
		},
		registrations: {
			'list': { verb: 'GET', url: 'accounts/{account_id}/registrations' }
		},
		resourceTemplates: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/resource_templates/{resourceId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/resource_templates' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/resource_templates/{resourceId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/resource_templates/{resourceId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/resource_templates' }
		},
	    
		servicePlan: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/service_plans/{planId}' },
			'add': { verb: 'POST', url: 'accounts/{account_id}/service_plans/{planId}' },
			'addMany': { verb: 'POST', url: 'accounts/{account_id}/service_plans/' },
			'remove': { verb: 'DELETE', url: 'accounts/{account_id}/service_plans/{planId}' },
			'removeMany': { verb: 'DELETE', url: 'accounts/{account_id}/service_plans/' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/service_plans/' },
			'addManyOverrides': { verb: 'POST', url: 'accounts/{account_id}/service_plans/override' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/service_plans' },
			'listCurrent': { verb: 'GET', url: 'accounts/{account_id}/service_plans/current' },
			'getCsv': { verb: 'GET', url: 'accounts/{account_id}/service_plans/current?depth=4&identifier=items&accept=csv' },
			'listAvailable': { verb: 'GET', url: 'accounts/{account_id}/service_plans/available' },
			'getAvailable': { verb: 'GET', url: 'accounts/{account_id}/service_plans/available/{planId}' },
			'reconciliate': { verb: 'POST', url: 'accounts/{account_id}/service_plans/reconciliation' },
			'synchronize': { verb: 'POST', url: 'accounts/{account_id}/service_plans/synchronization' }
		},
		temporalRule: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/temporal_rules/{ruleId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/temporal_rules' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/temporal_rules/{ruleId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/temporal_rules/{ruleId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/temporal_rules' }
		},
		temporalSet: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/temporal_rules_sets/{setId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/temporal_rules_sets' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/temporal_rules_sets/{setId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/temporal_rules_sets/{setId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/temporal_rules_sets' }
		},
		user: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/users/{userId}' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/users' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/users/{userId}' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/users/{userId}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/users' },
			'quickcall': { verb: 'GET', url: 'accounts/{account_id}/users/{userId}/quickcall/{number}'},
			'hotdesks': { verb: 'GET', url: 'accounts/{account_id}/users/{userId}/hotdesks' },
			'updatePresence': { verb: 'POST', url: 'accounts/{account_id}/users/{userId}/presence' }
		},
		voicemail: {
			'get': { verb: 'GET', url: 'accounts/{account_id}/vmboxes/{voicemailId}/messages' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/vmboxes' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/vmboxes/{voicemailId}' },
			'delete_box': { verb: 'DELETE', url: 'accounts/{account_id}/vmboxes/{voicemailId}' },
			'purge_box':  { verb: 'DELETE', url: 'accounts/{account_id}/vmboxes/{voicemailId}/messages' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/vmboxes/{voicemailId}/messages/{msg_id}' },
			'list': { verb: 'GET', url: 'accounts/{account_id}/vmboxes' }
		},
		webhooks: {
			'get': { 'verb': 'GET', 'url': 'accounts/{account_id}/webhooks/{webhookId}' },
			'create': { 'verb': 'PUT', 'url': 'accounts/{account_id}/webhooks' },
			'update': { 'verb': 'POST', 'url': 'accounts/{account_id}/webhooks/{webhookId}' },
			'delete': { 'verb': 'DELETE', 'url': 'accounts/{account_id}/webhooks/{webhookId}' },
			'list': { 'verb': 'GET', 'url': 'accounts/{account_id}/webhooks' },
			'listAccountAttempts': { 'verb': 'GET', 'url': 'accounts/{account_id}/webhooks/attempts' },
			'listAttempts': { 'verb': 'GET', 'url': 'accounts/{account_id}/webhooks/{webhookId}/attempts' },
			'listAvailable': { 'verb': 'GET', 'url': 'webhooks' },
			'patch': { 'verb': 'PATCH', 'url': 'accounts/{account_id}/webhooks/{webhookId}' },
			'patchAll': { 'verb': 'PATCH', 'url': 'accounts/{account_id}/webhooks' }
		},
		websockets: {
			'listEvents': { 'verb': 'GET', 'url': 'websockets' },
			'list': { 'verb': 'GET', 'url': 'accounts/{account_id}/websockets' },
			'listBindings': { 'verb': 'GET', 'url': 'accounts/{account_id}/websockets/{websocketId}' }
		},
		whitelabel: {
			'getByDomain': { verb: 'GET', url: 'whitelabel/{domain}' },
			'getLogoByDomain': { verb: 'GET', url: 'whitelabel/{domain}/logo' },
			'getIconByDomain': { verb: 'GET', url: 'whitelabel/{domain}/icon' },
			'getWelcomeByDomain': { verb: 'GET', url: 'whitelabel/{domain}/welcome', type: 'text/html', dataType: 'html' },
			'get': { verb: 'GET', url: 'accounts/{account_id}/whitelabel' },
			'getLogo': { verb: 'GET', url: 'accounts/{account_id}/whitelabel/logo' },
			'getIcon': { verb: 'GET', url: 'accounts/{account_id}/whitelabel/icon' },
			'getWelcome': { verb: 'GET', url: 'accounts/{account_id}/whitelabel/welcome', type: 'text/html', dataType: 'html' },
			'update': { verb: 'POST', url: 'accounts/{account_id}/whitelabel' },
			'updateLogo': { verb: 'POST', url: 'accounts/{account_id}/whitelabel/logo', type: 'application/x-base64' },
			'updateIcon': { verb: 'POST', url: 'accounts/{account_id}/whitelabel/icon', type: 'application/x-base64' },
			'updateWelcome': { verb: 'POST', url: 'accounts/{account_id}/whitelabel/welcome', type: 'text/html', dataType: 'html' },
			'create': { verb: 'PUT', url: 'accounts/{account_id}/whitelabel' },
			'delete': { verb: 'DELETE', url: 'accounts/{account_id}/whitelabel' },
			'listNotifications': { verb: 'GET', url: 'accounts/{account_id}/notifications' },
			'getNotification': { verb: 'GET', url: 'accounts/{account_id}/notifications/{notificationId}' },
			'getNotificationText': { verb: 'GET', url: 'accounts/{account_id}/notifications/{notificationId}', type: 'text/plain', dataType: 'text' },
			'getNotificationHtml': { verb: 'GET', url: 'accounts/{account_id}/notifications/{notificationId}', type: 'text/html', dataType: 'html' },
			'updateNotification': { verb: 'POST', url: 'accounts/{account_id}/notifications/{notificationId}' },
			'updateNotificationText': { verb: 'POST', url: 'accounts/{account_id}/notifications/{notificationId}', type: 'text/plain', dataType: 'text' },
			'updateNotificationHtml': { verb: 'POST', url: 'accounts/{account_id}/notifications/{notificationId}', type: 'text/html', dataType: 'html' },
			'previewNotification': { verb: 'POST', url: 'accounts/{account_id}/notifications/{notificationId}/preview' },
			'deleteNotification': { verb: 'DELETE', url: 'accounts/{account_id}/notifications/{notificationId}' },
			'getDnsEntries': { verb: 'GET', url: 'accounts/{account_id}/whitelabel/domains' },
			'checkDnsEntries': { verb: 'POST', url: 'accounts/{account_id}/whitelabel/domains?domain={domain}' }
		}
	},
	authTokens = {};

	/* Available settings:
	 * - apiRoot: [REQUIRED]
	 * - onRequestStart: [OPTIONAL]
	 * - onRequestEnd: [OPTIONAL]
	 * - onRequestSuccess: [OPTIONAL]
	 * - onRequestError: [OPTIONAL]
	 * - uiMetadata: [OPTIONAL]
	 * - authToken: [OPTIONAL]
	**/
	$.getKazooSdk = function(settings) {
		if(settings && typeof settings === 'string') { settings = { apiRoot: settings }; }
		if(settings && settings.apiRoot) {
			var sdkMethods = $.extend({}, baseMethods);
			$.each(sdkMethods, function() {
				if(typeof this === 'object') { this.parent = sdkMethods; }
			});
			sdkMethods.defaultSettings = settings;
			sdkMethods.request = request;

			if('authToken' in settings && settings.authToken.length > 0) {
				authTokens[settings.apiRoot] = settings.authToken;
			}

			$.each(methodsGenerator, function(group, methods) {
				sdkMethods[group] = sdkMethods[group] || {};
				$.each(methods, function(methodName, methodInfo) {
					sdkMethods[group][methodName] = function(methodSettings) {
						var self = this,
							methodSettings = methodSettings || {},
							requestSettings = {
								url: (methodSettings.apiRoot || settings.apiRoot) + methodInfo.url,
								verb: methodInfo.verb,
								data: {}
							},
							ids = $.map(methodInfo.url.match(/\{([^\}]+)\}/g) || [], function(v) { return v.replace(/\{|\}/g, ''); });

						if('filters' in methodSettings) {
							$.each(methodSettings.filters, function(filterKey, filterValue) {
								var valueArray = [].concat(filterValue);
								$.each(valueArray, function(key, value) {
									requestSettings.url += (requestSettings.url.indexOf('?') > 0 ? '&' : '?') + filterKey + '=' + value;
								});
							});
						}

						if('type' in methodInfo) { requestSettings.type = methodInfo.type; }
						if('dataType' in methodInfo) { requestSettings.dataType = methodInfo.dataType; }

						if(['post', 'delete', 'put', 'patch'].indexOf(methodInfo.verb.toLowerCase()) >= 0) {
							requestSettings.data.data = methodSettings.data || {};
							delete methodSettings.data;
						}

						// We extend methodSettings into a new map that we'll use to map the value with the right variable
						// With a URL like /accounts/search={test}&name={test}, if we don't use a new map, then the {test} variable is set to undefined during the second iteration
						// after we delete it from methodSettings a few line below, which creates a bug as the new URL will be /accounts/search=undefined&name=undefined.
						var staticValues = $.extend(true, {}, methodSettings);

						$.each(ids, function(k, v) {
							if(methodInfo.verb.toLowerCase() === 'post' && k === ids.length-1 && !(v in methodSettings)) {
								requestSettings.data[v] = requestSettings.data.data.id;
							} else {
								requestSettings.data[v] = staticValues[v];
								checkReservedKeywords(v, requestSettings);
								delete methodSettings[v];
							}
						});

						//These settings can not be overridden
						delete methodSettings.onRequestStart;
						delete methodSettings.onRequestEnd;
						delete methodSettings.onRequestSuccess;
						delete methodSettings.onRequestError;

						request($.extend({}, settings, methodSettings, requestSettings));
					}
				})
			});

			sdkMethods.authTokens = authTokens;
			return sdkMethods;
		} else {
			throw('You must provide a valid apiRoot.');
		}
	};

	function authFunction(settings, defaultSettings, url) {
		var apiRoot = settings.apiRoot || defaultSettings.apiRoot;
		request($.extend({}, defaultSettings, {
			url: apiRoot + url,
			verb: 'PUT',
			data: {
				data: settings.data
			},
			generateError: settings.hasOwnProperty('generateError') ? settings.generateError : true,
			success: function(data, status, jqXHR) {
				authTokens[apiRoot] = data.auth_token;
				settings.success && settings.success(data, status, jqXHR);
			},
			error: settings.error
		}));
	}

	function checkReservedKeywords(key, request) {
		var reservedKeys = [ 'apiRoot', 'authToken', 'cache', 'url', 'dataType', 'verb', 'type', 'dataType', 'onRequestStart', 'onRequestEnd', 'onRequestEnd', 'onRequestSuccess', 'uploadProgress' ];

		if(reservedKeys.indexOf(key) >= 0) {
			console.warn('URL Parameter "' + key + '" is overriding a core option of the AJAX request - ' + request.url);
		}
	}

	function request(options) {
		var settings = {
				cache: options.cache || false,
				url: options.url,
				dataType: options.dataType || 'json',
				type: options.verb || 'get',
				contentType: options.type || 'application/json',
				processData: false,
				beforeSend: function(jqXHR, settings) {
					options.onRequestStart && options.onRequestStart(jqXHR, options);

					jqXHR.setRequestHeader('X-Auth-Token', options.authToken || authTokens[options.apiRoot]);
					$.each(options.headers || [], function(key, val) {
						jqXHR.setRequestHeader(key, val);
					});
				}
			},
			mappedKeys = [],
			rurlData = /\{([^\}]+)\}/g,
			data = $.extend({}, options.data);

		if(options.hasOwnProperty('uploadProgress')) {
			settings.xhr = function() {
				var xhr = new window.XMLHttpRequest();
				//Upload progress
				xhr.upload.addEventListener("progress", options.uploadProgress, false);
				return xhr;
			}
		}

		settings.url = settings.url.replace(rurlData, function (m, key) {
			if (key in data) {
				mappedKeys.push(key);
				return data[key];
			}
		});

		settings.error = function requestError (error, status) {
			options.onRequestEnd && options.onRequestEnd(error, options);

			var parsedError = error;

			if('responseText' in error && error.responseText && error.getResponseHeader('content-type') === 'application/json') {
				parsedError = $.parseJSON(error.responseText);
			}

			// Added this to be able to display more data in the UI
			error.monsterData = {
				url: settings.url,
				verb: settings.type
			}

			options.onRequestError && options.onRequestError(error, options);

			options.error && options.error(parsedError, error, options.onRequestError);
		};

		settings.success = function requestSuccess(responseData, status, jqXHR) {
			options.onRequestEnd && options.onRequestEnd(responseData, options);

			options.onRequestSuccess && options.onRequestSuccess(responseData, options);

			options.success && options.success(responseData, options.onRequestSuccess);
		};

		// We delete the keys later so duplicates are still replaced
		$.each(mappedKeys, function(index, name) {
			delete data[name];
		});

		if(settings.type.toLowerCase() !== 'get'){
			var postData = data.data,
				envelopeKeys = {};

			if(data.hasOwnProperty('envelopeKeys')) {
				var protectedKeys = ['data', 'accept_charges'];

				_.each(data.envelopeKeys, function(value, key) {
					if(protectedKeys.indexOf(key) < 0) {
						envelopeKeys[key] = value
					}
				});
			};

			if(settings.contentType === 'application/json') {
				var payload = $.extend(true, {
					data: data.data || {}
				}, envelopeKeys);

				if('uiMetadata' in options) {
					payload.data.ui_metadata = options.uiMetadata;
				}

				if(options.acceptCharges === true) {
					payload.accept_charges = true;
				}

				postData = JSON.stringify(payload);
			}

			settings = $.extend(settings, {
				data: postData
			});
		}

		return $.ajax(settings);
	}

}( jQuery ));
