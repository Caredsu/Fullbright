<?php
require_once __DIR__ . "/config/database.php";

$totalCount = $teachers_collection->countDocuments();
echo "Verification: There are now $totalCount teachers in the database.\n";

$depts = ["ECT", "EDUC", "CCJE", "BHT"];
foreach ($depts as $dept) {
    $deptCount = $teachers_collection->countDocuments(["department" => $dept]);
    echo "- Department $dept: $deptCount teachers\n";
}
?>
