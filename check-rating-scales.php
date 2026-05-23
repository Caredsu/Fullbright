<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';

$questions = $questions_collection->find([], ['sort' => ['question_order' => 1]])->toArray();

echo "=== Questions in MongoDB ===\n";
foreach($questions as $q) {
  echo "\nQuestion: " . $q['question_text'] . "\n";
  if (isset($q['rating_scale'])) {
    echo "Rating Scale: " . json_encode($q['rating_scale']) . "\n";
  } else {
    echo "Rating Scale: NOT SET\n";
  }
}
