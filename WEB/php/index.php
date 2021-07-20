<?php  
  require_once ('../Settings.php');
  require_once ('Database.php');
  require_once ('SQL.php');
  require_once ('JSON.php');
  require_once ('Functions.php');

  $sql=null;

  set_error_handler("myErrorHandler");

  if(array_key_exists("event",$_GET))
    $_POST=$_GET;

  //bei falschen aufruf 'amp;' ausbessern:
  $_post_keys=array_keys($_POST);
  foreach ($_post_keys as $_Key)
  {
    if (strpos($_Key, 'amp;') !== false)
    {
      $_POST[str_replace('amp;','',$_Key)]=$_POST[$_Key];
      unset($_POST[$_Key]);
    }
  }

  //Mit Datenbank verbinden
  $sql = new SQL(server_sql, benutzer_sql, passwort_sql, dbname_sql,"error_event_schreiben");

  //events without json replay
  if($_POST["event"]=="newtemp")
  {
    if($_POST["key"]!=sensor_key) 
      die("E0");
    $mac=str_replace(":","",strtoupper($_POST['mac'])); 
    $temp=$_POST['temp'];
    //check inputs
    if(strlen($mac)!=12 || !ctype_xdigit($mac))
      die("E1");
    if(!is_numeric($temp))
      die("E2");
    $sql_ergebniss=$sql->query('SELECT `id` FROM `sensor` WHERE `mac` = \''.$sql->escape($mac).'\' LIMIT 1 ');
    if ($data=$sql_ergebniss->fetch())
    {
      //GET sensor
      $sensorid=$data['id'];
    }
    else
    {
      //ADD sensor
      $sql_ergebniss=$sql->query('INSERT INTO `sensor` (`mac`) VALUES (\''.$sql->escape($mac).'\')');
      $sensorid=$sql_ergebniss->insert_id();    
    }
    //ADD entry
    $sql_ergebniss=$sql->query('INSERT INTO `temp` (`sensor`,                      `time`,         `temp`) 
                                            VALUES (\''.$sql->escape($sensorid).'\', \''.time().'\', \''.$sql->escape($temp).'\');');
    die("OK");
  }
  elseif($_POST["event"]=="cornjob")
  {
    if($_POST["key"]!=cornjob_key) 
      die("Wrong Key!");
    
    print("Load all sensors... \n");
    $sql_ergebniss=$sql->query('SELECT * FROM `sensor` ');
    $sensors=$sql_ergebniss->fetch_all();    
    
    foreach($sensors as $sensor)
    {
      print("Sensor: ".$sensor["mac"]."\n");
      if(!filter_var($sensor["email"], FILTER_VALIDATE_EMAIL))
      {
        print("  email not valid skip!\n");
        continue;
      }
      
      $warings="";
      if($sensor["mintemp"]!==null || $sensor["maxtemp"]!==null)
      {
        $nextcheck=time()-10; #we are 10 secounds behind to not miss any records!
        $sql->query('UPDATE `sensor` SET `lastcheck` = \''.$nextcheck.'\' WHERE `id` = \''.$sql->escape($sensor["id"]).'\'');
        
        $sql_ergebniss=$sql->query('SELECT * FROM `temp` WHERE sensor = \''.$sql->escape($sensor["id"]).'\' AND `time` > \''.$sql->escape($sensor['lastcheck']).'\' AND `time` <= \''.$sql->escape($nextcheck).'\' ORDER BY `time` ASC');
        $temps=$sql_ergebniss->fetch_all();
        
        foreach($temps as $temp)
        {
          print("  check ".$temp["temp"]."\n");
          if($sensor["mintemp"]!==null)
          {
            if($sensor["mintemp"]>=$temp["temp"])
            {
              $text="Measured temperature is lower than the minimum value (".$sensor["mintemp"]."°C): ".$temp["temp"]."°C ".gmdate("d.m.y H:i:s", $temp["time"]+date("Z"))."\n";
              print("    ".$text);
              $warings.=$text;
            }
          }
          if($sensor["maxtemp"]!==null)
          {
            if($sensor["maxtemp"]<=$temp["temp"])
            {
              $text="Measured temperature is higher than the maximum value (".$sensor["maxtemp"]."°C): ".$temp["temp"]."°C ".gmdate("d.m.y H:i:s", $temp["time"]+date("Z"))."\n";
              print("    ".$text);
              $warings.=$text;
            }
          }
        }
      }
      if($sensor["timeout_sensor"])
      {
        print("  check timeout_sensor\n");
        $sql_ergebniss=$sql->query('SELECT MAX(time) as time FROM `temp` WHERE sensor = \''.$sql->escape($sensor["id"]).'\' ');
        $time=$sql_ergebniss->fetch();
        $time=$time["time"];
        if(time()-$time>$sensor["timeout_sensor"])
        {
          $lastentry="(No entry)";
          if($time)
          {
            $lastentry=gmdate("d.m.y H:i:s", $time+date("Z"));
          }
          $text="No new temperature reported! The last update was ".$lastentry.". Maybe the sensor is defect or there is a power outage!\n";
          print("    ".$text);
          $warings.=$text;
          
        }
      }
      if($warings!="" and time()-$sensor["lastemail"] > $sensor["timeout_email"])
      {
        $mail="Waring: \n\n";
        $mail.=$warings;
        $mail.="\n";
        $mail.="For more information visit: ".$_SERVER['HTTP_HOST']."\n\n";
        $betreff="Temperature Alert for Sensor ".sensor["name"]." [".sensor["mac"]."]!";
        $header="";
        $headers .= "From:Alert<noreplay@".$_SERVER['HTTP_HOST'].">\n";
        $headers .= "X-Mailer: PHP/" . phpversion(). "\n";
        $headers .= "X-Sender-IP: ".$_SERVER['REMOTE_ADDR']."\n";
        $headers .= "Content-type: text/plain\n";
        mail($sensor["email"], $betreff, $mail , $headers);
        
        $sql->query('UPDATE `sensor` SET `lastemail` = \''.time().'\' WHERE `id` = \''.$sql->escape($sensor["id"]).'\'');  

        print("  Email sent!\n");
      }
      else
      {
        print("  No Email sent!\n");
      }
    }
    
    
    die("ALL DONE!");
  }

  //check tables:
  if(is_null($sql->query("SELECT id FROM user LIMIT 1",0)))
  {
    if($_GET["callback"])
    {
      //initilise database:
      $sql_querys=$Database_Tabels.$Database_Admin_Entry;
      $sql_querys=explode(";",$sql_querys);
      foreach($sql_querys as $sql_query)
      {
        $sql->query($sql_query);    
      }
      error_event_schreiben("Database","Database was initialized! \nUsername:admin \nPassword:admin");
    }
    else
    {
      die("DataBaseError!");
    }
  }

  print_debug("CALL GET",print_r($_GET,true));
  print_debug("CALL POST",print_r($_POST,true));

  if (isset($_POST['event']))
  {
    $event=$_POST['event'];
  }  
  else
  {
    //No event
    error("no event");
  }

  //User managment:
  $passwordhash= hash('sha256', "_USER_".strtolower($_POST["name"]).$_POST["password"] );
  $user=false;
  if (isset($_COOKIE["cookie"]) and ctype_alnum($_COOKIE["cookie"]))
  {
    //check cookie:
    $sqlresult=$sql->query("SELECT * FROM `user` WHERE `cookie` = '".$sql->escape($_COOKIE["cookie"])."'");
    if($sqlresult->num_rows()==1)
    {
      $userdata=$sqlresult->fetch();
      if($event!="logout")
      {
        $user=true;
        //update time:
        $sql->query("UPDATE `user` SET `lastaktive` = '".time()."' WHERE `cookie` = '".$sql->escape($_COOKIE["cookie"])."'");
        setcookie("cookie",$_COOKIE["cookie"],time()+60*60*24*356); //One Year!
      }
    }
  }
  if($user==false){
    $userdata=array("id"=>0,"name"=>"guest");
    setcookie("cookie","",time()-3600); //clear cookie!
  }

  $output=null;

  if($event=="login")
  {
    if($user==true)
    {
      //Schon angemeldet!
      error("already logged in!"); 
    }
    else
    {
      print_debug("Login","Try to login ".$_POST["name"]." hash ".$passwordhash);
      $sqlresult=$sql->query("SELECT * FROM `user` WHERE `name` = '".$sql->escape(strtolower($_POST["name"]))."' and `password` = '".$sql->escape($passwordhash)."'");
      if($sqlresult->num_rows()!=1){
        //User password not found
        error("user or password not found!"); 
      }
      else
      {
        $userdata=$sqlresult->fetch();
        $_COOKIE["cookie"]= hash('sha256', microtime()."_GUEST_".rand().$userdata["name"]);
        //update time:
        $sql->query("UPDATE `user` SET `lastaktive` = '".time()."' , `cookie` = '".$sql->escape($_COOKIE["cookie"])."' WHERE `id` = '".$sql->escape($userdata['id'])."'");
        setcookie("cookie",$_COOKIE["cookie"],time()+60*60*24*356); //One Year!
        $output="OK";
      }
    }
  }
  elseif($event=="changepassword")
  {
    if($userdata["name"]!=$_POST['name'])
      error("WUPS....");
    if($_POST['password']=="")
      error("Enter a new password!");

    $sql->query("UPDATE `user` SET  `password` =  '".$sql->escape($passwordhash)."' WHERE `id` = '".$sql->escape($userdata['id'])."'");  
    $output="OK"; 
  }
  elseif($event=="logout")
  {
    $output="OK";  //Done above
  }
  elseif($event=="listsensors")
  {
    if($user==true)
    {
      $sql_ergebniss=$sql->query('SELECT * FROM `sensor` WHERE `user` = \''.$sql->escape($userdata['id']).'\' ');

      $output=$sql_ergebniss->fetch_all();    
    }
    else
    {
      $output=[];
    }
  }
  elseif($event=="savesensor")
  {
    if($user==true)
    {
      $id=$_POST["id"];
      $sql_ergebniss=$sql->query('SELECT `user` FROM `sensor` WHERE `id` = \''.$sql->escape($id).'\' ');
      if($sql_ergebniss->num_rows()!=1)
        error("Sensor not found!");
      $sql_ergebniss=$sql_ergebniss->fetch();
      if($sql_ergebniss["user"]!=$userdata["id"])
        error("This sensor does not belong to you!");
      
      $name=$_POST["name"];
      $email=$_POST["email"];
      $maxtemp=$_POST["maxtemp"];
      $mintemp=$_POST["mintemp"];
      $timeout_sensor=$_POST["timeout_sensor"];
      $timeout_email=$_POST["timeout_email"];
      
      if(strlen($name)>=100)
        error("The name is too long!");        
      if(!filter_var($email, FILTER_VALIDATE_EMAIL))
        error("The email is not valid!");
      
      if(!$maxtemp and $maxtemp!=="0")
        $maxtemp="NULL";
      else
        $maxtemp="'".$sql->escape($maxtemp)."'";
      if(!$mintemp and $mintemp!=="0")
        $mintemp="NULL";
      else
        $mintemp="'".$sql->escape($mintemp)."'";
      
      $sql->query('UPDATE `sensor` SET 
        `name` = \''.$sql->escape($name).'\',
        `email` = \''.$sql->escape($email).'\', 
        `maxtemp` = '.$maxtemp.', 
        `mintemp` = '.$mintemp.',
        `timeout_sensor` = \''.$sql->escape($timeout_sensor).'\', 
        `timeout_email` = \''.$sql->escape($timeout_email).'\',
        `lastemail` = \'0\',
        `lastcheck` = \''.time().'\'
        WHERE `id` = \''.$sql->escape($id).'\'');
      
      $output="OK";
    }
    else
    {
      error("Please login first!");
    }
  }
  elseif($event=="listtemps")
  {
    if($user==true)
    {
      $start=$_POST['start'];
      $stop=$_POST['stop'];
      if (!is_numeric($start) || !is_numeric($stop))
        error("internal error!");
      
      //calc interval:
      $interval = $stop-$start;
      if ($interval<0)
        error("internal error!");
      
      $groupinterval=1;
                  // 1m 2m 6m 30m  1h, 2h, 6h, 12h 1d 2d 4d 7d,   14d 28d 56d 112d  224d 1y            2y 4y 8y 10y   20y 40y
      foreach(array(60, 2, 3,  5,  2,  2,  3,   2, 2, 2, 2, 1.75,  2,  2,  2,   2,    2, 1.62946428571,2, 2, 2,  1.25, 2  ,2) as $mult){
        if ($interval/$groupinterval<max_points_to_dsplay)
          break;
        $groupinterval=$groupinterval*$mult;
      }
      $groupinterval=round($groupinterval);
      print_debug("groupinterval",$groupinterval);
      
      $sql_ergebniss=$sql->query('SELECT * FROM `sensor` WHERE `user` = \''.$sql->escape($userdata['id']).'\' ');
      $output=$sql_ergebniss->fetch_all();

      foreach($output as $i=>$sensor)
      {
        
        $sql_ergebniss=$sql->query('
          SELECT MIN(time) as time_min, MAX(time) as time_max ,AVG(time) as time_avg, MIN(temp) as temp_min, MAX(temp) as temp_max ,AVG(temp) as temp_avg
          FROM temp
          WHERE sensor= \''.$sql->escape($sensor["id"]).'\' AND `time` > \''.$sql->escape($start).'\' AND `time` < \''.$sql->escape($stop).'\'
          GROUP BY FLOOR(time/'.$groupinterval.')
          ORDER BY `temp`.`time` ASC
          ');
        $output[$i]["data"]=$sql_ergebniss->fetch_all();
      }
    }
    else
    {
      $output=[];
    }
  }
  elseif($event=="temps")
  {
    if($user!=true)
      error("Please login first!");

    $sensor=$_POST['sensor'];

      
    $sql_ergebniss=$sql->query('SELECT `user` FROM `sensor` WHERE `id` = \''.$sql->escape($sensor).'\' ');
    if($sql_ergebniss->num_rows()!=1)
      error("Sensor not found!");
    $sql_ergebniss=$sql_ergebniss->fetch();
    if($sql_ergebniss["user"]!=$userdata["id"])
      error("This sensor does not belong to you!");

    $start=$_POST['start'];
    $stop=$_POST['stop'];
    
    $sql_ergebniss=$sql->query('SELECT * FROM `temp` WHERE sensor = \''.$sql->escape($sensor).'\' AND `time` > \''.$sql->escape($start).'\' AND `time` < \''.$sql->escape($stop).'\' ORDER BY `time` ASC');
    $output=$sql_ergebniss->fetch_all();
  }
  elseif($event=="admin")
  {
    $aevent=$_POST["aevent"];

    if($userdata["id"]!=1)
      error("Not an administrator!");
    
    if($aevent=="adduser")
    {    
      if($_POST["name"]=="" or !ctype_alnum($_POST["name"]))
        error("Name not alphanumeric or empty!");
      //Does name exists?
      $sql_ergebniss=$sql->query('SELECT * FROM `user` WHERE `name` LIKE \''.$sql->escape($_POST["name"]).'\'');
      if($sql_ergebniss->num_rows()>=1)
        error("The name of the user allready exists");
      if($_POST["password"]=="")
        error("Use a passowrd!");

      //Insert
      $sql->query('INSERT INTO `user` (`name`, `password`) 
                VALUES (\''.$sql->escape($_POST["name"]).'\', \''.$sql->escape($passwordhash).'\' )');
      $output="OK";    
      
    }
    elseif($aevent=="userlist")
    {    
      $sql_ergebniss=$sql->query('SELECT * FROM `user` ');
      $output=$sql_ergebniss->fetch_all();
    }
    elseif($aevent=="remuser")
    { 
      if($_POST["name"]=="admin")
        error("admin cannot be removed!");

      //get user id:
      $id=$sql->query('SELECT id FROM user WHERE name= \''.$sql->escape($_POST["name"]).'\'');
      if($id->num_rows()!=1)
        error("User not found!");
      $id=$id->fetch();
      $id=$id['id'];
      
      $sql->query('DELETE FROM `user` WHERE `id` = \''.$sql->escape($id).'\'');
      $sql->query('UPDATE `sensor` SET `user` = NULL WHERE `user` = \''.$sql->escape($id).'\'');
      
      $output="OK";
    }
    elseif($aevent=="sensorlist")
    {    
      $sql_ergebniss=$sql->query('SELECT * FROM `sensor` ');
      $output=$sql_ergebniss->fetch_all();
    }
    elseif($aevent=="link")
    { 
      $sql->query('UPDATE `sensor` SET `user` = \''.$sql->escape($_POST["user"]).'\' WHERE `id` = \''.$sql->escape($_POST["sensor"]).'\'');
      $output="OK";
    }
    elseif($aevent=="dump")
    {
      ini_set('max_execution_time', '0');
      $return ="";
      //cycle through
      foreach($Database_TableNames_Backup as $table)
      {
        //load column names:
        $colums=array();      

        $colums_sql = $sql->query(' 
          SELECT `COLUMN_NAME` 
            FROM `INFORMATION_SCHEMA`.`COLUMNS` 
            WHERE `TABLE_SCHEMA`=\''.dbname_sql.'\' AND
                  `TABLE_NAME`=\''.$table.'\'
        ');
        while($row = $colums_sql->fetch())
        {
          array_push($colums,$row['COLUMN_NAME']);
        }
              
        $return.= 'INSERT INTO `'.$table.'` (';
        
        foreach($colums as $i => $colum)
        {
          $return.= '`'.$colum.'`';
          if ($i+1 != count($colums))
          {
            $return.=', ';
          }          
        }
                      
        $return.= ') VALUES '."\n";

        $result = $sql->query('SELECT * FROM '.$table);
        $num_rows = $result->num_rows();
        $counter=1;
        //Over tables
        while($row = $result->fetch())
        {   
            $return.= '(';

            //Over fields
            foreach($colums as $i => $colum)
            {
              if(is_null($row[$colum]))
              {
                $return.= 'NULL';                            
              }
              else
              {
                $return.= '\''.str_replace("\n","\\n",$sql->escape($row[$colum])).'\'';              
              }
              if ($i+1 != count($colums))
              {
                $return.=', ';
              }          
            }

            if($num_rows == $counter){
                $return.= ");\n";
            } else{
                $return.= "),\n";
            }
            $counter++;
        }
        
        $colums_sql = $sql->query(' 
          SELECT `AUTO_INCREMENT` 
            FROM `INFORMATION_SCHEMA`.`TABLES` 
            WHERE `TABLE_SCHEMA`=\''.dbname_sql.'\' AND
                  `TABLE_NAME`=\''.$table.'\'
        ');
        $autoincement = $colums_sql->fetch();
        $autoincement=$autoincement['AUTO_INCREMENT'];
        if ($autoincement)
          $return.='ALTER TABLE `'.$table.'` AUTO_INCREMENT='.$autoincement.';'."\n";
      }

      header( 'Expires: Sat, 26 Jul 1997 05:00:00 GMT' ); 
      header( 'Last-Modified: ' . gmdate( 'D, d M Y H:i:s' ) . ' GMT' ); 
      header( 'Cache-Control: no-store, no-cache, must-revalidate' ); 
      header( 'Cache-Control: post-check=0, pre-check=0', false ); 
      header( 'Content-type: text/plain ; charset=utf-8');
      header( 'Content-Disposition:attachment; filename='.preg_replace('/[^A-Za-z0-9]/', '_', $_SERVER['SERVER_NAME']).'_backup_'.date(DATE_ATOM).'.tim');
      header( 'Pragma: no-cache; Cache-control: no-cache, no-store');
      die($return);
    }
    elseif($aevent=="restore")  
    {  
      ini_set('max_execution_time', '0');
      
      //rename old tables
      foreach($Database_TableNames_Backup as $table)
      {
        $sql->query('RENAME TABLE `'.$table.'` TO `'.$table.'_old`;  ');      
      }    
      
      $error=0;    
      //initilise emty tables:
      $sql_querys=$Database_Tabels;
      $sql_querys=explode(";",$sql_querys);
      foreach($sql_querys as $sql_query)
      {
        if(trim($sql_query)=="")
          continue;
        $sql->query($sql_query);
      }
      
      //restor backup
      $sql_commands=file_get_contents($_FILES['backup']['tmp_name']);
      $sql_commands = preg_split("/\s*;[\n\r]\s*/", $sql_commands);
      foreach($sql_commands as $sql_command)
      {
        if(trim($sql_command)=="")
          continue;
        if($sql->query($sql_command,0)==null)
        {
          $error=1;
          break;
        }
      }    
      
      if($error==1)
      {
        //undo!
        //remove new tables
        foreach($Database_TableNames_Backup as $table)
        {
          $sql->query('DROP TABLE `'.$table.'`;  ');      
        }    
        //rename old tables
        foreach($Database_TableNames_Backup as $table)
        {
          $sql->query('RENAME TABLE `'.$table.'_old` TO `'.$table.'`;  ');      
        }   
        error("Could not restore backup!");
      }
      else
      {
        //remove old tables
        foreach($Database_TableNames_Backup as $table)
        {
          $sql->query('DROP TABLE `'.$table.'_old`;  ');      
        }  
      }        
      $output="OK";      
    }
    else
    {
      error("Admin Event unknown!");      
    }
  }
  else
  {
    error("Event unknown!");  
  }

  //Vor dem Beenden durchfuehren:
  $sql->close();

  //generate Output:
  $data=array();
  $data["data"]=$output;
  $data["user"]=$userdata["name"];
  senddata($data);
  


?>