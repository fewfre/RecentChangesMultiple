import Main from "./Main";

// Double check that script can run; should always be true due to loader, but check is here just encase.
let appConfig = (window.dev = window.dev || {}).RecentChangesMultiple = window.dev.RecentChangesMultiple || {};
if(document.querySelectorAll('.rc-content-multiple, #rc-content-multiple')[0] == undefined) {
	console.log("RecentChangesMultiple tried to run despite no data. Exiting.");
} else {
	Main.init(appConfig);
	window.dev.RecentChangesMultiple.app = Main;
}
