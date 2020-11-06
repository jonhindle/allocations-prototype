/* global $ */

// Warn about using the kit in production
if (window.console && window.console.info) {
  window.console.info('GOV.UK Prototype Kit - do not use for production')
}

$(document).ready(function () {
  window.GOVUKFrontend.initAll()

  $("[data-action='print-gp-form']").click(function(e){
  	window.open("https://www.nhs.uk/Servicedirectories/Documents/GMS1.pdf", "_blank")
  })
})



//this will alert the user when they click on a link 

function alertUser(evt) {
  evt.preventDefault();
  alert('Sorry, this has not been built yet. What would you expect to see?');
}

$('body').on('click', 'a[href="#"]', alertUser);
