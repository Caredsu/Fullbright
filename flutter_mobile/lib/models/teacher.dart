class Teacher {
  final String id;
  final String name;
  final String department;
  final String? subject;
  final String? profileImage;
  final String email;

  Teacher({
    required this.id,
    required this.name,
    required this.department,
    this.subject,
    this.profileImage,
    required this.email,
  });

  factory Teacher.fromJson(Map<String, dynamic> json) {
    // Handle API response format: first_name, middle_name, last_name
    String firstName = json['first_name'] ?? '';
    String middleName = json['middle_name'] ?? '';
    String lastName = json['last_name'] ?? '';
    
    // Construct full name from parts, or use 'name' field if it exists
    String fullName = json['name'] ?? '';
    if (fullName.isEmpty) {
      // Build name from parts
      List<String> nameParts = [];
      if (firstName.isNotEmpty) nameParts.add(firstName);
      if (middleName.isNotEmpty) nameParts.add(middleName);
      if (lastName.isNotEmpty) nameParts.add(lastName);
      fullName = nameParts.join(' ').trim();
    }
    
    return Teacher(
      id: json['_id'] ?? json['id'] ?? '',
      name: fullName.isNotEmpty ? fullName : 'Unknown Teacher',
      department: json['department'] ?? '',
      subject: json['subject'],
      profileImage: json['picture'] ?? json['profile_image'],
      email: json['email'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'department': department,
      'subject': subject,
      'profile_image': profileImage,
      'email': email,
    };
  }
}
