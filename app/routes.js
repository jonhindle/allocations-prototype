const express = require('express');
const router = express.Router();
const request = require('request');
const fs = require('fs');

//request.debug = true

// Add your routes here - above the module.exports line

let cases; 


//to generate a new set of data, upload /app/data/prisoners.schema.json to mockaroo.com	
let getCases = function(){
	fs.readFile(__basedir + "/app/data/prisoners.json", function(err, data){
		if (err) throw err;
  		cases = JSON.parse(data);
	});
}

getCases();

router.all("*", function(req, res, next){

	res.locals.query = req.query;

	const users = require("../app/data/users.js");
	if(!req.session.data.user){
		req.session.data.user = users[0];
	}
	next();
});

router.get("/prototype-admin/reset-data", function(req, res, next){
	getCases();
	console.log(req.header('Referer'));
	res.redirect(req.header('Referer'));
});


router.post("/resettlement-planning/:personId/*", function(req, res, next){
	res.locals.person = cases.filter(person => person.index == req.params.personId)[0];
	next();
});

router.get("/resettlement-planning/:personId/*", function(req, res, next){
	res.locals.person = cases.filter(person => person.index == req.params.personId)[0];

	console.log(res.locals.person)
	next();
});

router.get("/resettlement-planning", function(req, res, next){
	res.locals.caseList = cases;
	next();
});


//gp routes

router.get("/resettlement-planning/:personId/gp", function(req, res, next){
	let person = cases.filter(person => person.index == req.params.personId)[0];
	if(person.gpid){
		res.locals.surgery = require("../app/data/doctors.js")
							.filter(doctor => doctor.id = person.gpid)[0];
		res.redirect(`/resettlement-planning/${req.params.personId}/gp-form-print`);
	} else {
		res.locals.surgeries = require("../app/data/doctors.js");
		next();
	}
})



router.get("/probation/gp", function(req, res, next){
	
	res.locals.surgeries = require("../app/data/doctors.js");
	next();
})

router.get("/probation/gp/:gpid/", function(req, res, next){
	res.locals.surgery = require("../app/data/doctors.js").filter(surgery => surgery.id === req.params.gpid)[0];

	res.render("probation/gp-details");
});

router.post("/resettlement-planning/:personId/register-gp/:gpid", function(req, res, next){

	let person = cases.filter(person => person.index == req.params.personId)[0];
	
	person.previousName = req.body["previous-name"];
	person.nhsNumber = req.body["nhs-number"];
	person.phone = req.body["phone"];

	next();
});

router.get("/resettlement-planning/:personId/register-gp/:gpid/edit-gp", function(req, res, next){
	res.locals.surgery = require("../app/data/doctors.js").filter(surgery => surgery.id === req.params.gpid)[0];

	res.render("resettlement-planning/edit-gp");
});

router.get("/resettlement-planning/:personId/register-gp/:gpid", function(req, res, next){
	res.locals.surgery = require("../app/data/doctors.js").filter(surgery => surgery.id === req.params.gpid)[0];

	res.render("resettlement-planning/register-gp");
});

router.post("/resettlement-planning/:personId/gp-form-print", function(req, res, next){
	let person = cases.filter(person => person.index == req.params.personId)[0];

	person.gpid = req.body.gpid;

	next();
});

router.get("/resettlement-planning/:personId/gp-form-print", function(req, res, next){
	res.locals.surgery = require("../app/data/doctors.js").filter(surgery => surgery.id === res.locals.person.gpid)[0];
	next();
})


//housing

router.post("/resettlement-planning/:personId/housing", function(req, res, next){

	if(req.body.resetHousing){
		delete res.locals.person.releaseLocation;
		res.locals.person.hasAddress = false;
	} 
	next();
})

router.post("/resettlement-planning/:personId/address", function(req, res, next){
	let person = cases.filter(person => person.index == req.params.personId)[0];
	if(req.body['address-confirmed'] === "yes"){
		person.hasAddress = true;
		person.addressConfirmed = true;
		res.redirect(`/resettlement-planning/${req.params.personId}/details`)
	} else if(req.body['address-confirmed'] === "no"){
		person.hasAddress = false;
		next();
	}
	next();
	
})

router.post("/resettlement-planning/:personId/housing-2", function(req, res, next){
	res.locals.person.addressProvided = req.body["address-provided"];
	next()
});


router.post("/resettlement-planning/:personId/housing-3", function(req, res, next){
	res.locals.person.releaseLocation = req.body["release-location"];
	res.redirect(`/resettlement-planning/${req.params.personId}/housing`)
});



router.post("/resettlement-planning/:personId/housing-post", function(req, res, next){
	let person = cases.filter(person => person.index == req.params.personId)[0];
	
	person.hasAddress = true;
	person.addressConfirmed = true;
	person.addressProvidedOn = new Date();

	person.address.street = req.body["address-street"];
	person.address.city = req.body["address-town"];
	person.address.postcode = req.body["address-postcode"];

	console.log(person)

	res.redirect(`/resettlement-planning/${req.params.personId}/details`)
});


//email routes

router.post("/resettlement-planning/:personId/email-2", function(req, res, next){

	res.locals.person.hasEmail = req.body["has-email"] === "yes";
	res.locals.person.emailProvider = req.body["email-provider"];
	res.locals.person.email = req.body["email"];
	res.locals.person.emailPassword = req.body["password"];

	if(req.body["has-email"] == "yes"){
		res.redirect(`/resettlement-planning/${req.params.personId}/benefits-checklist`)
	}

	next();
});

//employment routes

router.post("/resettlement-planning/:personId/work", function(req, res, next){
	res.locals.person.hasWork = req.body["has-work"];

	if(req.body["has-work"] == "yes"){
		res.redirect(`/resettlement-planning/${req.params.personId}/details`)
	}
	next();
});

//banking routes

router.post("/resettlement-planning/:personId/bank", function(req, res, next){
	res.locals.person.hasBank = req.body["has-bank"];

	if(req.body["has-bank"] == "yes"){
		res.redirect(`/resettlement-planning/${req.params.personId}/benefits-checklist`)
	}
	next();
});


//ID routes

router.post("/resettlement-planning/:personId/primary-id", function(req, res, next){
	if(req.body.id['primary-id'] == "yes"){
		res.locals.person.primaryIdComplete = true;
		res.redirect(`/resettlement-planning/${req.params.personId}/benefits-checklist`)
	} else {
		res.redirect(`/resettlement-planning/${req.params.personId}/proof-of-id-2`)
	}

	next();
});

router.post("/resettlement-planning/:personId/secondary-id", function(req, res, next){
	if(req.body.id['secondary-id'] == 2){
		res.locals.person.secondaryIdComplete = true;
		res.redirect(`/resettlement-planning/${req.params.personId}/benefits-checklist`)
	} else {
		res.redirect(`/resettlement-planning/${req.params.personId}/secondary-id-2`)
	}

	next();
});


router.post("/resettlement-planning/:personId/b79-complete", function(req, res, next){
	res.locals.person.b79 = req.session.data.b79;
	res.locals.person.b79.complete = true;
	delete req.session.data.b79;
	next();
});


//sign in routes
router.all("/authentication/users", function(req, res, next){
	res.locals.users = require("../app/data/users.js");

	next();
});


router.post("/authentication/sign-in", function(req, res, next){
	const users = require("../app/data/users.js")
		.filter(user => user.login.username == req.body.username || user.email == req.body.username || user.mobile == req.body.username)
		console.log(users);

	if(users.length === 0){
		res.locals.invalidLogin = true;
		res.render("authentication/sign-in");
	} else {
		if(users[0].login.password !== req.body.password){
			res.locals.invalidLogin = true;
			res.render("authentication/sign-in");
		} else {
			req.session.data.user = users[0];
			
			if(users[0].existingUser){
				res.redirect(`/probation`);			
			} else {
				res.redirect(`/authentication/register-2`);		
			}
		}
	}

});

router.post("/authentication/register-2", function(req, res, next){


	if(req.body["password"] !== req.body["password-confirm"] ){
		res.locals.invalidLogin = true;
		res.render("authentication/register-2");
	} else if(!req.body["password"]){
		res.locals.invalidLogin = true;
		res.render("authentication/register-2");
	} else {
		res.redirect(`/authentication/register-3`);		
	}


});

router.post("/authentication/register-3", function(req, res, next){
	console.log(req.body['contact-details'].indexOf("email"));
	console.log(req.body['contact-by-email']);
	console.log(req.body['contact-by-phone']);
	let errors = {
		showErrors: false,
		email: false,
		phone: false
	}

	if(req.body['contact-details'].indexOf("email") > -1){
		if(req.body['contact-by-email'].length === 0){
			errors.showErrors = true;
			errors.email = true;
		}
	}

	if(req.body['contact-details'].indexOf("phone") > -1){
		if(req.body['contact-by-phone'].length === 0){
			errors.showErrors = true;
			errors.phone = true;
		}
	}
	if(errors.showErrors){
		res.locals.errors = errors;
		res.render("authentication/register-3");
		
	} else {
		res.redirect(`/probation`);	
	}
	

});

//genetal route functions
router.get("/resettlement-planning/:personId/:pageName", function(req, res, next){
	res.render("resettlement-planning/" + req.params.pageName);
});



module.exports = router;
