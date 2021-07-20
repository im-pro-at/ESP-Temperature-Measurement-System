<?php


header( 'Expires: Sat, 26 Jul 1997 05:00:00 GMT' ); 
header( 'Last-Modified: ' . gmdate( 'D, d M Y H:i:s' ) . ' GMT' ); 
header( 'Cache-Control: no-store, no-cache, must-revalidate' ); 
header( 'Cache-Control: post-check=0, pre-check=0', false ); 
header( 'Content-type: text/html; charset=utf-8');
header( 'Pragma: no-cache; Cache-control: no-cache, no-store');

?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
	<head>
    <meta charset="utf-8">
    <link rel="icon" href="images/logo.png">
		<link rel="stylesheet" href="css/jquery-ui.css">
		<link rel="stylesheet" href="css/index.css">
		<script src="js/jquery.min.js"></script>
		<script src="js/jquery-ui.min.js"></script>
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
		<script src="js/index.js"></script>

		<title>temp.im-pro.at</title>
	</head>
	<body>
  
    <!-- head --> 
    <div id="head">
      <table id="haedtable">
        <tr id= "haedtable_search">
          <td id="haedtable_date">
            <span id="date_span">
              <label for="date_from">Von</label>
              <input type="text" id="date_from" name="date_from">
              <label for="date_to">bis</label>
              <input type="text" id="date_to" name="date_to">
            </span>
            <button id="date_update">Update</button>
          </td>
          <td id="haedtable_user">
            <div id="user">                   
            </div>
          </td>
          <td id="haedtable_settings">
            <div id="settings"> 
            </div>
          </td>
          <td id="haedtable_logo">
            <div id="fountainG">
              <img src="images/logo.png"/>
              <div id="fountainG_1" class="fountainG"></div>
              <div id="fountainG_2" class="fountainG"></div>
              <div id="fountainG_3" class="fountainG"></div>
              <div id="fountainG_4" class="fountainG"></div>
              <div id="fountainG_5" class="fountainG"></div>
              <div id="fountainG_6" class="fountainG"></div>
            </div>
          </td>
        </tr>
      </table>	
    </div>
    
    <div id="placeholder"> 
      <!-- emulate header distance --> 
    </div>
    
    <div id="graph">
    </div>
    
    <!-- Dialogs --> 
    <div id="d_login">
      <form id="login_form" action="javascript:void(0);">
        <fieldset id="login_content" class="mydialog">
          <label for="login_name">Username: </label>
          <input type="text" name="login_name" id="login_name" value="" autocomplete="username">
          <label for="login_password">Password: </label>
          <input type="password" name="login_password" id="login_password" value="" autocomplete="current-password">
        </fieldset>	
      </form>
    </div>			
	</body>
</html>
