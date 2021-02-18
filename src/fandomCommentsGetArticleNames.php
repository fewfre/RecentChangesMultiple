<?php
$wiki = $_GET["wiki"] ?? null;
if(!$wiki || strpos($wiki, ".fandom.") == false) { die("Wiki name not specified or invalid"); }
$ids = $_GET["stablePageIds"] ?? "";

// $url = "https://$wiki.fandom.com/wikia.php?controller=FeedsAndPosts&method=getArticleNamesAndUsernames&stablePageIds=$ids&format=json";
$url = "$wiki/wikia.php?controller=FeedsAndPosts&method=getArticleNamesAndUsernames&stablePageIds=$ids&format=json";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
$result = curl_exec($ch);
curl_close($ch);

header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');
echo $result;