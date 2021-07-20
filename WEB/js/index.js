/*
  index.js
  
  Autor: im-pro
*/
              
function custom_alert(output_msg, title_msg)
{
	if (!title_msg)
			title_msg = 'Error';

	if (!output_msg)
			output_msg = 'No Message to Display.';

	$("<div></div>").html(output_msg).dialog({
			title: title_msg,
			resizable: false,
			modal: true,
			buttons: {
					"Ok": function() 
					{
							$( this ).dialog( "close" );
							$( this ).dialog( "destroy" );
					}
			}
	});
}

function custom_dialog(output_msg, title_msg, OK_button, CANCEL_button, OK_event, CANCEL_event,CLOSE_event)
{
	if (!title_msg)	title_msg='Error';
	if (!output_msg) output_msg='No Message to Display.';

	var div=$( "<div />" ).append(output_msg);
	div.find("input").keyup(function(e){
		if(e.keyCode==13) 
		{
      if(OK_event()) div.dialog( "close" );						
		}
	});

	if (!OK_event) OK_event=function(){return true;}; 
	if (!CANCEL_event) CANCEL_event=function(){return true;}; 
	if (!CLOSE_event) CLOSE_event=function(){}; 

	var buttons={};
	if(OK_button)
		buttons[OK_button] = function() {
						if(OK_event()) div.dialog( "close" );						
					};
	if (CANCEL_button) 
		buttons[CANCEL_button] = function() {
						if(CANCEL_event()) div.dialog( "close" );
					}			
	div.dialog({
			title: title_msg,								
			resizable: false,
			modal: true,
			buttons: buttons,
			close: function() {
        $("div[role=tooltip]").remove();
        CLOSE_event();
				div.dialog( "destroy" );
			}
		});	
	return div;
}

function setLoadState(state){
	if(state)
		$(".fountainG").css("display", "block");
	else
		$(".fountainG").css("display", "none");
}

var logedin=false;


var backend= "php/";
var busy=false;
function loader(request,respondfunction)
{
	busy=true;
	setLoadState(true);
	console.log(request);
  var processData=true;
  var contentType='application/x-www-form-urlencoded; charset=UTF-8';
  if(FormData.prototype.isPrototypeOf(request)){
    //Send FormData:
    processData=false;
    contentType=false;
  }  
	$.ajax({
		url: backend,
		dataType: "jsonp",
		method: "POST",
		data: request,
    processData: processData,
    contentType: contentType,
		success: function( data ) {
			console.log(data);
			setLoadState(false);
			busy=false;
			if(data==null)
			{
				custom_alert("Communication error!");
				return;
			}
			if(data["error"])
			{
				custom_alert($("<pre/>").text(data["error"]),"Error Message");            
			}
			if(data["user"])
			{
				logedin=(data["user"]!="guest");
        $("#user").attr("title",data["user"]);
        if(logedin)
        {
          $("#user").addClass("active");       
        }
        else{
          $("#user").removeClass("active");                 
        }
			}
      if(data["debug"])
      {
        console.log(data["debug"]);
      }
			if(data["data"])
			{
				respondfunction(data["data"]);
			}
		},
		error: function( x, serror )
		{
			setLoadState(false);
			busy=false;
			custom_alert("Communication error. Server not reachable! Check your internet connection.");
      $.ajax({
          url: backend,
          dataType: "text",
          method: "POST",
          processData: processData,
          contentType: contentType,
          data: request,
          success: function( data ) {
            console.log(data);
          }
      });
		}
	});  
}

var lasttempdate=[];
var laststart=0;
var laststop=0;
function eventHandler(event, parameter){
	if(busy)
		return;
	console.log("Event: "+event+" ("+parameter+")");
	if(event=="logout")
	{
		loader(
			{
				event: "logout", 
			},
			function(){
        eventHandler("listtemps");
      }
		);
	}
	if(event=="listtemps")
	{
    if(!parameter)
    {
      laststart=getDate( $( "#date_from" ).get(0) ).getTime()/1000;
      laststop=getDate( $( "#date_to" ).get(0) ).getTime()/1000+24*60*60-1;//+23:59:59
    }
    else
    {
      laststart=parameter["min"];
      laststop=parameter["max"];
    }
		loader(
			{
				event: "listtemps", 
				start:  laststart,
				stop:   laststop, 
			},
			function(data){
        var fdate=new google.visualization.DateFormat({pattern: 'dd.MM.yy HH:mm'});
        var fcelsius=new google.visualization.NumberFormat({pattern: '#.## °C'});
        datatables=[];
        data.forEach(function(sensor){
          var name=sensor["name"];
          if(!sensor["name"])
            name=sensor["mac"];
          var datatable = new google.visualization.DataTable();
          datatable.addColumn('datetime', 'Time');
          datatable.addColumn('number', name);
          datatable.addColumn({'type': 'string', 'role': 'tooltip','p': {'html': true}})          
          datatable.addColumn({id:'i0', type:'number', role:'interval'});
          datatable.addColumn({id:'i0', type:'number', role:'interval'});  
          sensor["data"].forEach(function(data){
            html='\
            <ul style="list-style-type:none; margin:1em 0 1em 0; padding:0">\
              <li style="margin:1em 0 1em 0; padding:0 2em 0 2em">\
                <span style="font-family:Arial;font-size:14px;color:#000000;opacity:1;margin:0;font-style:none;text-decoration:none;font-weight:none;">\
                  Sensor:\
                </span>\
                <span style="font-family:Arial;font-size:14px;color:#000000;opacity:1;margin:0;font-style:none;text-decoration:none;font-weight:bold;">\
                  '+name+'\
                </span>\
              </li>\
              <li style="margin:1em 0 1em 0; padding:0 2em 0 2em">\
                <span style="font-family:Arial;font-size:14px;color:#000000;opacity:1;margin:0;font-style:none;text-decoration:none;font-weight:none;">\
                  Time:\
                </span>\
                <span style="font-family:Arial;font-size:14px;color:#000000;opacity:1;margin:0;font-style:none;text-decoration:none;font-weight:bold;">\
                  From '+(new Date(data["time_min"] * 1000)).toLocaleString()+' to '+(new Date(data["time_max"] * 1000)).toLocaleString()+'\
                </span>\
              </li>\
              <li style="margin:0.65em 0 0.65em 0; padding:0 2em 0 2em">\
                <span style="font-family:Arial;font-size:14px;color:#000000;opacity:1;margin:0;font-style:none;text-decoration:none;font-weight:none;">\
                  Temperature:\
                </span>\
                <span style="font-family:Arial;font-size:14px;color:#000000;opacity:1;margin:0;font-style:none;text-decoration:none;font-weight:bold;"> \
                  '+parseFloat(data["temp_avg"]).toFixed(2)+' °C [ MIN: '+data["temp_min"]+' °C, MAX: '+data["temp_max"]+' °C ]\
                </span>\
              </li>\
            </ul>';
            datatable.addRow([new Date(data["time_avg"] * 1000),parseFloat(data["temp_avg"]),html,parseFloat(data["temp_min"]),parseFloat(data["temp_max"])]);
          });
          fcelsius.format(datatable, 1);
          datatables.push(datatable)
        });
        data=new google.visualization.DataTable();
        data.addColumn('datetime', 'Time');
        data.addColumn('number', "NO SENSOR FOUND!");
        if (datatables.length>0)
        {
          data=datatables[0];
          cols=[];
          for(var i=1;i< datatables.length;i++)
          {
            cols.push(4*(i-1)+1);
            cols.push(4*(i-1)+2);
            cols.push(4*(i-1)+3);
            cols.push(4*(i-1)+4);
            data = google.visualization.data.join(data, datatables[i], 'full', [[0, 0]], cols, [1,2,3,4]);
          }
        }
        fdate.format(data, 0);
        lasttempdate=data;
        eventHandler("regraph");
      }  
		);
	}
	if(event=="regraph")
	{

    var options = {
      height: ($( window ).height()-100)*0.95,
      width: $(window).width()*0.95,
      interpolateNulls: true,
      hAxis: {
        title: 'Time',
        format: 'dd.MM.yy \nHH:mm',
        viewWindow:{min: new Date(laststart * 1000), max: new Date(laststop * 1000)}
      },
      vAxis: {
        title: 'Temperature',
        format:'#.## °C'
      },
      intervals: { 'style':'area' },
      tooltip: { isHtml: true },
      explorer: { 
        axis: 'horizontal',
      },
    };
    
    var container = document.getElementById('graph');
    var chart = new google.visualization.LineChart(container);

  var lasttimeout=null;
  google.visualization.events.addListener(chart, 'ready', function () {
    var zoomLast = getCoords();
    var observer = new MutationObserver(function () {
      var zoomCurrent = getCoords();
      if (JSON.stringify(zoomLast) !== JSON.stringify(zoomCurrent)) {
        zoomLast = getCoords();
        console.log('zoom event',zoomCurrent);
        if(lasttimeout)
          clearTimeout(lasttimeout)
        lasttimeout=setTimeout(function(){ eventHandler("listtemps",zoomLast); }, 1000);
        
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: true
    });
  });

    function getCoords() {
      var chartLayout = chart.getChartLayoutInterface();
      var chartBounds = chartLayout.getChartAreaBoundingBox();

      return {
        min: Math.round(chartLayout.getHAxisValue(chartBounds.left).getTime()/1000),
        max: Math.round(chartLayout.getHAxisValue(chartBounds.width + chartBounds.left).getTime()/1000),
      };
    }    
    
    chart.draw(lasttempdate, options);
  }  
}

function getDate( element ) {
  var date;
  try {
    date = $.datepicker.parseDate( "dd.mm.yy", element.value );
  } catch( error ) {
    date = null;
  }
  return date;
}

//initialisieren
$(function() {
  //init date range
  $( "#date_from" )
    .datepicker({
      changeMonth: true,
      changeYear: true,
      dateFormat: "dd.mm.yy"
    })
    .on( "change", function() {
      $( "#date_to" ).datepicker( "option", "minDate", getDate( this ) );
    });
  $( "#date_to" )
    .datepicker({
      changeMonth: true,
      changeYear: true,
      dateFormat: "dd.mm.yy"
    })
    .on( "change", function() {
      $( "#date_from" ).datepicker( "option", "maxDate", getDate( this ) );
    });
  var d = new Date();
  $( "#date_to" ).val($.datepicker.formatDate("dd.mm.yy",d)).change()
  d.setMonth(d.getMonth() - 1); 
  $( "#date_from" ).val($.datepicker.formatDate("dd.mm.yy",d)).change()


  //Add tooltips
	$(document).tooltip(
  {
		content: function() {
			var element = $(this);
			
			return  $("<pre \>").text(element.attr("title"));
		},
    open: function (event, ui) {
        ui.tooltip.css("max-width", "50vw");
    }
  });
  
	//make reach input filds:
	$( "textarea, input:text, input:password, input[type=email], input[type=number], input[type=url]" ).addClass("text ui-widget ui-widget-content ui-corner-all");
	$( "label" ).addClass("ui-widget");
	$( "button" ).button();
			
	//init Buttons and Events:
	$( "#user" ).click(function(){
    console.log(logedin);
		if(logedin)
		{
  		eventHandler("logout");
		}
		else
		{
      d_login.dialog( "open" );  
		}
	});

	//init login dialog
  d_login_execute=function(){
    loader(
      {
        event: "login", 
        name: $( "#login_name" ).val(),
        password: $( "#login_password" ).val()
      },function(){
        d_login.dialog( "close" );
        eventHandler("listtemps");
      });
  }
	$( "#login_form input" ).keyup(function(e){
		if(e.keyCode==13) 
    {
 			e.preventDefault();
      d_login_execute();      
    }
	});
	d_login = $( "#d_login" ).dialog({
		autoOpen: false,
		title: "Login",
		modal: true,
		buttons: {
			"Login": function(){d_login_execute()},      
			Cancel: function() {
				d_login.dialog( "close" );
			}
		},
		close: function() {
			$( "#login_name" ).val("");
			$( "#login_password" ).val("");			
		}
	});	
	
	//Admin
	$( "#settings" ).click(function(){
    if(!logedin)
    {
      custom_alert("Please login first!", "Settings:")
      return;
    }  
    
    var div=$("<div \>");
    $( "<a \>").attr("href","#").text("Change password").click(function(){
      var username=$( "#login_name" ).val();
      var dialog=$("<div/>").css({width:"100%"});
      $("<p/>").text("New Password:").appendTo(dialog)
      var password_input=$("<input type=text >");
      $("<p/>").append(password_input).appendTo(dialog);
      
      var d_newpassword=custom_dialog(dialog,"New Password:","Save","Cancel",function(){

      loader(
        {
          event: "changepassword", 
          name:  $("#user").attr("title"),
          password:  password_input.val()
        },
        function(data){
          d_newpassword.dialog("close");
          custom_alert("Password set!","Change password");
        });        
      });
    }).appendTo(div);
    $( "<br>" ).appendTo(div);
    $( "<a \>").attr("href","#").text("Sensor settings").click(function(){
      loader(
        {
          event: "listsensors"
        },
        function(data){
          var dialog=$("<div/>").css({width:"100%"});
          $("<p/>").text("Select Sensor:").appendTo(dialog)
          var sensor_input=$("<select>");
          data.forEach(function(sensor){
            var name = sensor["name"];
            if(!name) name="?";
            sensor_input.append($("<option>").val(sensor['id']).text(name+" ["+sensor["mac"]+"]"));
          });
          $("<p/>").append(sensor_input).appendTo(dialog);

          var d_slectsensor=custom_dialog(dialog,"Select Sensor:","Select","Cancel",function(){
            var sensor=null;
            data.forEach(function(akt){
              if (akt["id"] == sensor_input.val()) sensor = akt;
            });
            d_slectsensor.dialog("close");
            console.log(sensor)
            var dialog=$("<div/>").css({width:"100%"});

            $("<h3/>").text("Settings for Sensor ["+sensor["mac"]+"]:").appendTo(dialog)
            
            var name_input=$("<input type=text>").val(sensor["name"]).css({width:"300px"});
            $("<div/>").append($("<span/>").text("Name:").css({display:"inline-block",width:"200px"})).append(name_input).appendTo(dialog)
            var email_input=$("<input type=text>").val(sensor["email"]).css({width:"300px"}).attr("title","Email Address for notifications!");
            $("<div/>").append($("<span/>").text("E-mail:").css({display:"inline-block",width:"200px"})).append(email_input).appendTo(dialog)
            var mintemp_input=$("<input type=text>").val(sensor["mintemp"]).css({width:"300px"}).attr("title","If one temperature reading is lower as this value an email will be sent! Leave blank for no notification.");
            $("<div/>").append($("<span/>").text("Min Temperature").css({display:"inline-block",width:"200px"})).append(mintemp_input).append($("<span/>").text("°C")).appendTo(dialog)
            var maxtemp_input=$("<input type=text>").val(sensor["maxtemp"]).css({width:"300px"}).attr("title","If one temperature reading is higher as this value an email will be sent! Leave blank for no notification.");
            $("<div/>").append($("<span/>").text("Max Temperature").css({display:"inline-block",width:"200px"})).append(maxtemp_input).append($("<span/>").text("°C")).appendTo(dialog)
            
            var time_lookup={
              0:  ["OFF",                  0],
              1:  ["10 minutes",     10*60-5], 
              2:  ["30 minutes",     30*60-5],
              3:  ["1 hour",       1*60*60-5],
              4:  ["2 hours",      2*60*60-5],
              5:  ["3 hours",      3*60*60-5],
              6:  ["5 hours",      5*60*60-5],
              7:  ["12 hours",    12*60*60-5],
              8:  ["1 day",     1*24*60*60-5],
              9:  ["2 days",    2*24*60*60-5],
              10: ["3 days",    3*24*60*60-5],
              11: ["1 week",    7*24*60*60-5],
              12: ["2 week",    7*24*60*60-5],
              13: ["3 week",    7*24*60*60-5],
              14: ["1 month",  30*24*60*60-5],

            };
            
            var timeout_sensor_titel=$("<p/>");
            var timeout_sensor_titel_update=function(value){
              timeout_sensor_titel.text("Sensor timeout: "+time_lookup[value][0] );
            }
            var timeout_sensor_slider=$( "<div/>" ).css({width:"500px"}).slider({
              min: 0,
              max: 14,
              value: 0,
              change: function(e,ui){timeout_sensor_titel_update(ui.value)},
              slide: function(e,ui){timeout_sensor_titel_update(ui.value)}
            }).attr("title","If no new temperature reading is reported (normal interval is 1 minute) a Email will be send.");
            Object.keys(time_lookup).forEach(function(i){
              if(time_lookup[i][1]==sensor["timeout_sensor"])
                timeout_sensor_slider.slider( "value", i );
            });
            timeout_sensor_titel_update(timeout_sensor_slider.slider("value"));
            $("<div/>").append(timeout_sensor_titel).append(timeout_sensor_slider).appendTo(dialog);

            var timeout_email_titel=$("<p/>");
            var timeout_email_titel_update=function(value){
              timeout_email_titel.text("Email timeout: "+time_lookup[value][0] );
            }
            var timeout_email_slider=$( "<div/>" ).css({width:"500px"}).slider({
              min: 1,
              max: 14,
              value: 1,
              change: function(e,ui){timeout_email_titel_update(ui.value)},
              slide: function(e,ui){timeout_email_titel_update(ui.value)},
            }).attr("title","If one Email was send there will be no new one till this time is passed.");
            Object.keys(time_lookup).forEach(function(i){
              if(time_lookup[i][1]==sensor["timeout_email"])
                timeout_email_slider.slider( "value", i );
            });
            timeout_email_titel_update(timeout_email_slider.slider("value"));
            $("<div/>").append(timeout_email_titel).append(timeout_email_slider).appendTo(dialog);

            var d_adduser=custom_dialog(dialog,"Sensor Settings:","Save","Cancel",function(){
              loader(
              {
                event: "savesensor",
                id: sensor["id"],
                name: name_input.val(),
                email: email_input.val(),
                mintemp: mintemp_input.val().replace(",","."),
                maxtemp: maxtemp_input.val().replace(",","."),
                timeout_sensor: time_lookup[timeout_sensor_slider.slider("value")][1],
                timeout_email: time_lookup[timeout_email_slider.slider("value")][1],
              },
              function(data){
                d_adduser.dialog("close");
                eventHandler("listtemps");
              });
            }).dialog("option", "width", 600);
          });
          
        });        
    }).appendTo(div);
    $( "<br>" ).appendTo(div);
    $( "<a \>").attr("href","#").text("Export").click(function(){
      loader(
        {
          event: "listsensors"
        },
        function(data){
          var dialog=$("<div/>").css({width:"100%"});
          var sensor_input=$("<select>");
          data.forEach(function(sensor){
            var name = sensor["name"];
            if(!name) name="?";
            sensor_input.append($("<option>").val(sensor['id']).text(name+" ["+sensor["mac"]+"]"));
          });
          $("<p/>").text("Select Sensor:").appendTo(dialog)
          $("<p/>").append(sensor_input).appendTo(dialog);

          var datefrom_input = $("<input type=text>").val($( "#date_from" ).val())
            .datepicker({
              changeMonth: true,
              changeYear: true,
              dateFormat: "dd.mm.yy"
            })
            .on( "change", function() {
              dateto_input.datepicker( "option", "minDate", getDate( this ) );
            });
          var dateto_input = $("<input type=text>").val($( "#date_to" ).val())
            .datepicker({
              changeMonth: true,
              changeYear: true,
              dateFormat: "dd.mm.yy"
            })
            .on( "change", function() {
              datefrom_input.datepicker( "option", "maxDate", getDate( this ) );
            }).change();
          datefrom_input.change();
          
          $("<p/>").text("From:").appendTo(dialog)
          $("<p/>").append(datefrom_input).appendTo(dialog)
          $("<p/>").text("To:").appendTo(dialog)
          $("<p/>").append(dateto_input).appendTo(dialog)

          var format_input=$("<select>");
          format_input.append($("<option>").val(0).text("Europe (sep=;)"));
          format_input.append($("<option>").val(1).text("USA (sep=,)"));
          $("<p/>").text("Format:").appendTo(dialog)
          $("<p/>").append(format_input).appendTo(dialog);
          

          var d_slectsensor=custom_dialog(dialog,"Select Sensor:","Export","Cancel",function(){
            var sensor=null;
            data.forEach(function(akt){
              if (akt["id"] == sensor_input.val()) sensor = akt;
            });
            console.log(sensor)
            loader(
            {
              event: "temps",
              sensor: sensor["id"],
              start:  getDate( datefrom_input.get(0) ).getTime()/1000,
              stop:  getDate( dateto_input.get(0) ).getTime()/1000+24*60*60-1, //+23:59:59              
            },
            function(data){
              console.log(data);
              var datatable = new google.visualization.DataTable();
              datatable.addColumn('datetime', 'Time');
              datatable.addColumn('number', 'Temperature');
              data.forEach(function(temp){
                datatable.addRow([new Date(temp["time"] * 1000),parseFloat(temp["temp"])]);
              });

              if(format_input.val()==0){
                var fdate=new google.visualization.DateFormat({pattern: 'dd*MM*yy HH:mm'});
                fdate.format(datatable, 0);
              }
              var csvFormattedDataTable = "Time,Temperature\n" + google.visualization.dataTableToCsv(datatable);
              if(format_input.val()==0){
                csvFormattedDataTable=csvFormattedDataTable.replaceAll(",",";").replaceAll(".",",").replaceAll("*",".");
              }
              var encodedUri = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvFormattedDataTable);
              var a=$("<a/>").attr("href",encodedUri).attr("download", 'export-'+sensor["name"]+'-'+datefrom_input.val()+'-'+dateto_input.val()+'.csv').attr("target",'_blank');
              
              document.body.appendChild(a.get(0));
              a.get(0).click();
              document.body.removeChild(a.get(0));
              
              d_slectsensor.dialog("close");
            });
            
          });
        }
      );
    }).appendTo(div);
    
    
    
    
    if($("#user").attr("title")=="admin")
    {
      $( "<br>" ).appendTo(div);
      $( "<a \>").attr("href","#").text("Add user").click(function(){
        var dialog=$("<div/>").css({width:"100%"});
        $("<p/>").text("Username:").appendTo(dialog)
        var username_input=$("<input type=text>");
        $("<p/>").append(username_input).appendTo(dialog)
        $("<p/>").text("Password:").appendTo(dialog)
        var password_input=$("<input type=text>");
        $("<p/>").append(password_input).appendTo(dialog)

        var d_adduser=custom_dialog(dialog,"Add a new user:","Create","Cancel",function(){
          loader(
          {
            event: "admin",
            aevent: "adduser",      
            name: username_input.val(),      
            password: password_input.val()      
          },
          function(data){
            d_adduser.dialog("close");
          });
        });
      }).appendTo(div);
      $( "<br>" ).appendTo(div);
      $( "<a \>").attr("href","#").text("Remove user").click(function(){
        loader(
        {
          event: "admin",
          aevent: "userlist"  
        },
        function(data){
          var dialog=$("<div/>").css({width:"100%"});
          $("<p/>").text("Username:").appendTo(dialog)
          var username_input=$("<select>");
          data.forEach(function(user){
            username_input.append($("<option>").val(user['name']).text(user['name']));
          });
          $("<p/>").append(username_input).appendTo(dialog);

          var d_remuser=custom_dialog(dialog,"Remove a user:","Remove","Cancel",function(){
            loader(
            {
              event: "admin",
              aevent: "remuser",      
              name: username_input.val()      
            },
            function(data){
              d_remuser.dialog("close");
            });
          });
        });
      }).appendTo(div);
      $( "<br>" ).appendTo(div);
      $( "<a \>").attr("href","#").text("Link User to Sensor").click(function(){
        loader(
        {
          event: "admin",
          aevent: "userlist"  
        },
        function(users){
          loader(
          {
            event: "admin",
            aevent: "sensorlist"  
          },
          function(sensors){
            var dialog=$("<div/>").css({width:"100%"});
            
            $("<p/>").text("Link user:").appendTo(dialog)
            var username_input=$("<select>");
            users.forEach(function(user){
              username_input.append($("<option>").val(user['id']).text(user['name']));
            });
            $("<p/>").append(username_input).appendTo(dialog);
            $("<p/>").text("to sensor:").appendTo(dialog)
            var sensor_input=$("<select>");
            sensors.forEach(function(sensor){
              var username="NONE";
              users.forEach(function(user){
                if (user["id"]==sensor['user'])
                  username=user["name"];
              });
              sensor_input.append($("<option>").val(sensor['id']).text(sensor['mac']+" ("+username+")"));
            });
            $("<p/>").append(sensor_input).appendTo(dialog);
            var d_link=custom_dialog(dialog,"Link User to Sensor","Link","Cancel",function(){
              loader(
              {
                event: "admin",
                aevent: "link",
                user: username_input.val(),  
                sensor: sensor_input.val()      
              },
              function(data){
                d_link.dialog("close");
              });
            });
            
          });
        });
      }).appendTo(div);
      $( "<br>" ).appendTo(div);
      $( "<a \>").attr("href",backend+"?"+"event=admin&aevent=dump").text("Create Backup").appendTo(div);;
      $( "<br>" ).appendTo(div);
      $( "<a \>").attr("href","#").text("Restore Backup").click(function(){
        var dialog=$("<div/>").css({width:"100%"});
        $("<p/>").html("Warning: <b>All Data will be overridden!!!</b>").appendTo(dialog)
        $("<p/>").text("BackupFile:").appendTo(dialog)
        var file_input=$("<input type=file accept='.tim'>");
        $("<p/>").append(file_input).appendTo(dialog)

        var d_restore=custom_dialog(dialog,"Restore Backup:","Restore","Cancel",function(){
          var send = new FormData();
          send.append('event','admin');
          send.append('aevent','restore');
          send.append('backup',file_input[0].files[0]);
          send.append('','');
          loader(
          send,
          function(data){
            custom_dialog($("<div>Successfully resort!</div>"),"Restore Backup:","OK");
            d_restore.dialog("close");
          });
        }).dialog("option", "width", 600).dialog("option", "height", 500);            
      }).appendTo(div);
    }
    custom_dialog(div,"Settings:");
  });
  
  $( "#date_update" ).click(function(){
    eventHandler("listtemps");	
	});
  $( "#date_from,#date_to" ).keyup(function(e){
		if(e.keyCode==13) 
    {
 			e.preventDefault();
      eventHandler("listtemps");      
    }
	});
  
  $(window).resize(function(){
    eventHandler("regraph");	  
  });

	
});

google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(function(){
  eventHandler("listtemps");
});

