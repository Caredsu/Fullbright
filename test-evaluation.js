import axios from 'axios';

const testEvaluation = async () => {
  try {
    const response = await axios.post('http://localhost:3005/api/evaluations', {
      teacher_id: '67825b6f8b4e2a1c3b5f0001',
      rating: 4.5,
      feedback: 'Test evaluation - This is a great teacher!',
      questions_responses: [
        { question: 'Q1', answer: 5 },
        { question: 'Q2', answer: 4 }
      ]
    }, {
      withCredentials: true
    });
    
    console.log('✅ Evaluation submitted successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
};

testEvaluation();
