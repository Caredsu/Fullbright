// Use native fetch in Node.js v18+
const BASE_URL = 'http://localhost:8080/api';

async function testE2E() {
  console.log('🧪 E2E Test: Per-Student Duplicate Prevention\n');

  try {
    // Step 1: Get list of teachers
    console.log('1️⃣  Fetching teachers list...');
    const teachersRes = await fetch(`${BASE_URL}/teachers`, { method: 'GET' });
    const teachersData = await teachersRes.json();
    const teacher = teachersData.data?.data?.[0];
    
    if (!teacher) {
      console.log('❌ No teachers found in DB. Insert sample teachers first.');
      process.exit(1);
    }
    console.log(`✅ Found teacher: ${teacher.first_name} ${teacher.last_name} (ID: ${teacher._id || teacher.id})`);

    const teacherId = teacher._id || teacher.id;

    // Step 2: Create evaluation for Student A
    console.log('\n2️⃣  Creating evaluation for Student A (2201010092)...');
    const evalRes = await fetch(`${BASE_URL}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher_id: teacherId,
        student_id: '2201010092',
        rating: 5,
        feedback: 'Test evaluation from Student A',
        questions_responses: [],
        answers: {}
      })
    });
    const evalData = await evalRes.json();
    
    if (!evalData.success) {
      console.log('❌ Failed to create evaluation:', evalData.message);
      process.exit(1);
    }
    console.log(`✅ Evaluation created for Student A`);

    // Step 3: Check Student A's evaluated teachers
    console.log('\n3️⃣  Checking Student A\'s evaluated teachers...');
    const checkARes = await fetch(`${BASE_URL}/evaluations/check-evaluated-teachers?student_number=2201010092&device_id=dev_xyz`, { method: 'GET' });
    const checkAData = await checkARes.json();
    console.log(`✅ Student A evaluated ${checkAData.count} teacher(s):`, Object.keys(checkAData.data));

    // Step 4: Check Student B's evaluated teachers (should be different!)
    console.log('\n4️⃣  Checking Student B\'s evaluated teachers (should be EMPTY)...');
    const checkBRes = await fetch(`${BASE_URL}/evaluations/check-evaluated-teachers?student_number=2201010099&device_id=dev_abc`, { method: 'GET' });
    const checkBData = await checkBRes.json();
    console.log(`✅ Student B evaluated ${checkBData.count} teacher(s):`, Object.keys(checkBData.data));

    // Step 5: Verify they're different
    console.log('\n5️⃣  Verification:');
    const studentATeachers = Object.keys(checkAData.data).length;
    const studentBTeachers = Object.keys(checkBData.data).length;
    
    if (studentATeachers > 0 && studentBTeachers === 0) {
      console.log('✅ PASS: Student A has evaluations, Student B has none (as expected)');
      console.log('🎉 Per-student duplicate prevention is working correctly!');
    } else {
      console.log('❌ FAIL: Evaluation data contaminated between students');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Test error:', err.message);
    process.exit(1);
  }
}

testE2E();
