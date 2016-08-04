var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport("SMTP", {
  service: "Gmail",
  auth: {
    XOAuth2: {
      user: "clipvnet@gmail.com",                                          
      clientId: "1080796480018-8fnuqk53hfv5v5eml024g45jvmjmlvu5.apps.googleusercontent.com",
      clientSecret: "SFDCpe_zjxw6GW3loy46lnFZ",
      refreshToken: "1/ZQFtt-7agvy63ysMBCDeCPSDVrfmxELNbdF3dIr1_DI"
    }
  }
});
var config = {
  urlApp: {
    NoteSecurity: 'http://107.167.182.130:3000'
  },
  url: 'http://107.167.182.130:3000'
};

exports.templates = {
    active: function(app, email, id){
      if(config.urlApp[app]) config.url = config.urlApp[app];
      var activeLink = config.url + '/oauth/active/' + id;
      return {
        ignoreTLS : true,
        from: '"NoteSecurity mobile application" <clipvnet@gmail.com>',
        to: email,
        subject: 'Active NoteSecurity account',
        html: '<b>Hello ' + email.split('@')[0] + '!</b>' + 
              '<p>Thanks for signing up for NoteSecurity Mobile app! Please click the link below to confirm your email address and active your account.<br/><br/><a href="'+ activeLink + '">' + activeLink + '</a></p>' + 
              '<br/><br/>Happy using!<br/>Team Just4developments<br/>'
      };
    },
    changePassword: function(app, email, encryptData){
      if(config.urlApp[app]) config.url = config.urlApp[app];
      var activeLink = config.url + '/oauth/changePassword/' + encryptData;
      return {
        ignoreTLS : true,
        from: '"NoteSecurity mobile application" <clipvnet@gmail.com>',
        to: email,
        subject: 'Change password of NoteSecurity account',
        html: '<b>Hello ' + email.split('@')[0] + '!</b>' + 
              '<p>Please click the link below to confirm the changing.<br/><br/><a href="'+ activeLink + '">' + activeLink + '</a></p>' + 
              '<br/><br/>Happy using!<br/>Team Just4developments<br/>'
      };
    }
};

exports.send = function(mailOptions){
	transporter.sendMail(mailOptions, function(error, info){
    if(error) {
    	console.log(error);
    	return;
    }
    transporter.close();
	});
}