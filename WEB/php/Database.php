<?php
/*
  Database.php
  
  Autor: im-pro
*/

$Database_TableNames_Backup= array('user', 'sensor', 'temp');
$Database_Tabels=
  '
  CREATE TABLE `user` (
    `id` int(14) unsigned NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NULL,
    `password` varchar(100)  NULL,
    `lastaktive` int( 14 ) NOT NULL,
    `cookie` varchar(100) NOT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE=INNODB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=2 ;

  CREATE TABLE `sensor` (
    `id` int(14) unsigned NOT NULL AUTO_INCREMENT,
    `mac` varchar(12) NOT NULL,
    `user` int(14) unsigned DEFAULT NULL,
    `name` varchar(100) DEFAULT NULL,
    `email` varchar(100) DEFAULT NULL,
    `maxtemp` FLOAT DEFAULT NULL,
    `mintemp` float DEFAULT NULL,
    `timeout_sensor` int(10) unsigned DEFAULT NULL,
    `timeout_email` int(10) unsigned DEFAULT NULL,
    `lastemail` int( 14 ) unsigned DEFAULT NULL,
    `lastcheck` int( 14 ) unsigned DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX(`user`)
  ) ENGINE=INNODB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=1 ;


  CREATE TABLE `temp` (
    `sensor` int(14) unsigned NOT NULL,
    `time` int( 14 ) NOT NULL,
    `temp` float DEFAULT NULL,
    INDEX(`sensor`,`time`)
  ) ENGINE=INNODB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  ';
$Database_Admin_Entry=
  '
  INSERT INTO `user` (`id`, `name`, `password`, `lastaktive`, `cookie`) VALUES
  (1, "admin", "5a52fc6648e5e02c69420711b3b89395abf8a8240be6f8f5b5bee0b8ade31073", 0, "")
  ';


?>