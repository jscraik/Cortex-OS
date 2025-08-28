========================
CODE SNIPPETS
========================

TITLE: HTTP GET Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API and process the JSON response. It shows how to handle successful responses and errors based on the status code.

SOURCE: <https://pub.dev/packages/http/versions/1.1.1/example>

LANGUAGE: Dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: HTTP GET Request Example (Dart)
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API, decode the JSON response, and print the total number of books found. It includes error handling for non-200 status codes.

SOURCE: <https://pub.dev/packages/http/versions/1.0.0/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: HTTP Request Example
DESCRIPTION: This is a conceptual example of how the http package might be used to make an HTTP GET request. It demonstrates the Future-based API for handling responses.

SOURCE: <https://pub.dev/packages/http/versions/0.11.3%2B15/score>

LANGUAGE: Dart
CODE:

```
// Example of making an HTTP GET request (conceptual)
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  final response = await http.get(Uri.parse('https://example.com/data'));
  if (response.statusCode == 200) {
    print(response.body);
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: HTTP GET Request Example
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API and process the JSON response. It checks the status code and prints the total number of books found or an error message.

SOURCE: <https://pub.dev/packages/http/versions/1.1.0/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API and process the JSON response. It shows how to await the response, check the status code, decode JSON, and print the total number of books found.

SOURCE: <https://pub.dev/packages/http/versions/0.12.1/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url = 'https://www.googleapis.com/books/v1/volumes?q={http}';

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: HTTP Request Example
DESCRIPTION: Demonstrates making a GET request using the http package and handling the response. It shows how to import the package, make a request, and process the response body.

SOURCE: <https://pub.dev/packages/http/versions/0.11.3%2B5/score>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchPost() async {
  final response = await http.get(Uri.parse('https://jsonplaceholder.typicode.com/posts/1'));

  if (response.statusCode == 200) {
    // If the server did return a 200 OK response,
    // then parse the JSON.
    print(response.body);
  } else {
    // If the server did not return a 240 OK response,
    // then throw an exception.
    throw Exception('Failed to load album');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API, process the JSON response, and print the total number of books found. It includes error handling for non-200 status codes.

SOURCE: <https://pub.dev/packages/http/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API, decode the JSON response, and print the total number of books found. It includes error handling for non-200 status codes.

SOURCE: <https://pub.dev/packages/http/versions/1.3.0/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: http package usage
DESCRIPTION: Demonstrates how to use the http package for making HTTP requests. This is a basic example showing a GET request.

SOURCE: <https://pub.dev/packages/http/versions/0.7.1/score>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> main() async {
  final url = Uri.parse('https://example.com');
  final response = await http.get(url);

  if (response.statusCode == 200) {
    print('Response body: ${response.body}');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: HTTP GET Request Example
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API, decode the JSON response, and print the total number of books found. It handles successful responses (status code 200) and request failures.

SOURCE: <https://pub.dev/packages/http/versions/1.4.0/example>

LANGUAGE: Dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: This example demonstrates how to perform an HTTP GET request using the http package in Dart. It fetches data from the Google Books API, decodes the JSON response, and prints the total number of books found.

SOURCE: <https://pub.dev/packages/http/versions/0.13.0-nullsafety.0/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API, process the JSON response, and print the total number of books found. It includes error handling for non-200 status codes.

SOURCE: <https://pub.dev/packages/http/versions/0.13.6/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Fetch Google Books API Data
DESCRIPTION: Example demonstrating how to use the http package to make a GET request to the Google Books API, decode the JSON response, and print the total number of books found.

SOURCE: <https://pub.dev/packages/http/versions/1.1.2/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: HTTP GET Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API and process the JSON response. It handles successful responses (status code 200) by decoding the JSON and printing the total number of books found, and reports errors for other status codes.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B3/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url = 'https://www.googleapis.com/books/v1/volumes?q={http}';

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to perform an HTTP GET request to the Google Books API, decode the JSON response, and print the total number of books found. It handles successful responses (status code 200) and request failures.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B4/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url = 'https://www.googleapis.com/books/v1/volumes?q={http}';

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: http Package Information
DESCRIPTION: Provides details about the 'http' Dart package, including its version, publication date, compatibility, likes, downloads, and dependencies. It also links to the README, changelog, example, installation guide, versions, and scores.

SOURCE: <https://pub.dev/packages/http/versions/0.12.1/score>

LANGUAGE: Dart
CODE:

```
Package: http
Version: 0.12.1
Published: 5 years ago
Dart 3 incompatible
Latest: 1.5.0
Likes: 8.3k
Downloads: 12.1M
Dependencies: http_parser, path, pedantic
Repository (GitHub)
View/report issues
```

---

TITLE: Dart HTTP Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request using the 'http' package and process the JSON response. It fetches book data from the Google Books API based on a query.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B1/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url = "https://www.googleapis.com/books/v1/volumes?q={http}";

  // Await the http get response, then decode the json-formatted responce.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print("Number of books about http: $itemCount.");
  } else {
    print("Request failed with status: ${response.statusCode}.");
  }
}
```

---

TITLE: HTTP GET Request Example (Dart)
DESCRIPTION: Demonstrates how to perform an HTTP GET request using the http package in Dart. It fetches data from the Google Books API, decodes the JSON response, and prints the total number of books found or an error message if the request fails.

SOURCE: <https://pub.dev/packages/http/versions/1.5.0-beta.2/example>

LANGUAGE: Dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API, process the JSON response, and print the total number of books found. It handles successful responses (status code 200) and request failures.

SOURCE: <https://pub.dev/packages/http/versions/0.12.2/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url = 'https://www.googleapis.com/books/v1/volumes?q={http}';

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Dart HTTP GET Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request using the http package in Dart. It fetches data from the Google Books API, decodes the JSON response, and prints the total number of books found or an error message if the request fails.

SOURCE: <https://pub.dev/packages/http/versions/1.5.0-beta/example>

LANGUAGE: Dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: http package installation
DESCRIPTION: Instructions on how to install the http package for Dart projects.

SOURCE: <https://pub.dev/packages/http/versions/0.7.5/score>

LANGUAGE: Dart
CODE:

```
http: ^0.7.5
```

---

TITLE: HTTP Requests in Dart
DESCRIPTION: Demonstrates how to make HTTP requests using the http package. This includes GET, POST, and handling responses. It's a fundamental example for network operations.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B3/score>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  final response = await http.get(Uri.parse('https://jsonplaceholder.typicode.com/posts/1'));

  if (response.statusCode == 200) {
    print('Response body: ${response.body}');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}

Future<void> postData() async {
  final response = await http.post(
    Uri.parse('https://jsonplaceholder.typicode.com/posts'),
    headers: <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: jsonEncode<Map<String, dynamic>>(<String, dynamic>{
      'title': 'foo',
      'body': 'bar',
      'userId': 1,
    }),
  );

  if (response.statusCode == 201) {
    print('Response body: ${response.body}');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}

void main() {
  fetchData();
  postData();
}
```

---

TITLE: Dart HTTP Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API using the 'http' package and process the JSON response. It checks the status code and prints the total number of books found for a given query.

SOURCE: <https://pub.dev/packages/http/versions/0.13.3/example>

LANGUAGE: Dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: http Package Information
DESCRIPTION: Provides details about the http package, including its version, publication date, likes, downloads, and dependencies. It also offers links to the Readme, Installation guide, Versions, and Scores.

SOURCE: <https://pub.dev/packages/http/versions/0.2.7%2B0/score>

LANGUAGE: APIDOC
CODE:

```
Package: http
Version: 0.2.7+0
Published: 12 years ago
Latest Version: 1.5.0
Likes: 8.3k
Downloads: 12.1M
Dependencies: unittest
Description: A composable, Future-based API for making HTTP requests.
Links:
  - Readme
  - Installing
  - Versions
  - Scores
```

---

TITLE: Dart HTTP Request Example
DESCRIPTION: Demonstrates making an asynchronous HTTP GET request to the Google Books API and processing the JSON response. It checks the status code and prints the total number of books found or an error message.

SOURCE: <https://pub.dev/packages/http/versions/0.13.1/example>

LANGUAGE: Dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Import http package in Dart code
DESCRIPTION: Example of how to import the 'http' package into a Dart file to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Dart HTTP Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API, process the JSON response, and print the total number of books found. It handles successful responses and potential request failures.

SOURCE: <https://pub.dev/packages/http/versions/0.13.0/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;
import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse = convert.jsonDecode(response.body);
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Import http package in Dart code
DESCRIPTION: Example of how to import the http package into a Dart file to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.8.10/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: HTTP Requests with http Package
DESCRIPTION: Demonstrates how to make HTTP requests using the http package in Dart. This includes examples for common methods like GET and POST, and how to handle responses.

SOURCE: <https://pub.dev/packages/http/versions/0.11.3%2B3/changelog>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  var url = Uri.parse('https://example.com/data');
  var response = await http.get(url);
  print('Response status: ${response.statusCode}');
  print('Response body: ${response.body}');
}

Future<void> postData() async {
  var url = Uri.parse('https://example.com/post');
  var response = await http.post(url, body: {'name': 'flutter', 'surname': 'example'});
  print('Response status: ${response.statusCode}');
  print('Response body: ${response.body}');
}
```

---

TITLE: Import http package in Dart code
DESCRIPTION: Example of how to import the 'http' package into your Dart files to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.2.8%2B2/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: http Package Usage
DESCRIPTION: Demonstrates the basic usage of the http package for making GET requests and handling responses. It shows how to import the package and perform a simple network operation.

SOURCE: <https://pub.dev/packages/http/versions/0.13.0-nullsafety.0/score>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchPost() async {
  final response = await http.get(Uri.parse('https://jsonplaceholder.typicode.com/posts/1'));

  if (response.statusCode == 200) {
    // If the server did return a 200 OK response,
    // then parse the JSON.
    print(response.body);
  } else {
    // If the server did not return a 240 OK response,
    // then throw an exception.
    throw Exception('Failed to load album');
  }
}
```

---

TITLE: http package usage
DESCRIPTION: Demonstrates basic usage of the http package for making GET and POST requests.

SOURCE: <https://pub.dev/packages/http/versions/0.5.5/score>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  final response = await http.get(Uri.parse('https://jsonplaceholder.typicode.com/posts/1'));

  if (response.statusCode == 200) {
    print(response.body);
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}

Future<void> postData() async {
  final response = await http.post(
    Uri.parse('https://jsonplaceholder.typicode.com/posts'),
    headers: <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: jsonEncode<Map<String, dynamic>>(<String, String>{
      'title': 'foo',
      'body': 'bar',
      'userId': '1',
    }),
  );

  if (response.statusCode == 201) {
    print(response.body);
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: http_parser Package Information
DESCRIPTION: Provides details about the http_parser package, including its version, publication date, platform compatibility, likes, pub points, and download statistics. It also lists dependencies and links to related resources like the README, changelog, and example.

SOURCE: <https://pub.dev/packages/http/_parser/versions/4.1.0/score>

LANGUAGE: pub.dev
CODE:

```
Package: http_parser
Version: 4.1.0
Published: 14 months ago
Latest: 4.1.2
Platform: [unknown platforms]
Likes: 260
Pub Points: 0
Downloads: 7.15M
Dependencies: collection, source_span, string_scanner, typed_data
Repository: GitHub
Issues: View/report issues
```

---

TITLE: pubspec.yaml Configuration
DESCRIPTION: Example of a `pubspec.yaml` file for the http package, specifying its version and SDK constraints.

SOURCE: <https://pub.dev/packages/http/versions/0.13.6/score>

LANGUAGE: YAML
CODE:

```
dependencies:
  http: ^0.13.6
```

---

TITLE: Import http Package in Dart
DESCRIPTION: Example of how to import the http package into your Dart code to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.6.6/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Dart HTTP Request Example
DESCRIPTION: Demonstrates how to make an HTTP GET request to the Google Books API and process the JSON response. It handles successful responses and request failures.

SOURCE: <https://pub.dev/packages/http/versions/1.2.1/example>

LANGUAGE: dart
CODE:

```
import 'dart:convert' as convert;

import 'package:http/http.dart' as http;

void main(List<String> arguments) async {
  // This example uses the Google Books API to search for books about http.
  // https://developers.google.com/books/docs/overview
  var url =
      Uri.https('www.googleapis.com', '/books/v1/volumes', {'q': '{http}'});

  // Await the http get response, then decode the json-formatted response.
  var response = await http.get(url);
  if (response.statusCode == 200) {
    var jsonResponse =
        convert.jsonDecode(response.body) as Map<String, dynamic>;
    var itemCount = jsonResponse['totalItems'];
    print('Number of books about http: $itemCount.');
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: http Package Installation
DESCRIPTION: Instructions on how to add the http package to your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.13.1/changelog>

LANGUAGE: Dart
CODE:

```
http: ^0.13.1
```

---

TITLE: http Package Usage
DESCRIPTION: Demonstrates basic usage of the http package for making GET requests and handling responses. Includes setting headers and handling potential errors.

SOURCE: <https://pub.dev/packages/http/versions/0.11.3%2B11/score>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  final url = Uri.parse('https://jsonplaceholder.typicode.com/posts/1');
  try {
    final response = await http.get(url, headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    });

    if (response.statusCode == 200) {
      print('Response body: ${response.body}');
    } else {
      print('Request failed with status: ${response.statusCode}.');
    }
  } catch (e) {
    print('An error occurred: $e');
  }
}

void main() {
  fetchData();
}
```

---

TITLE: Import http Package in Dart
DESCRIPTION: Example of how to import the http package into your Dart code to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.5.17/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Making HTTP Requests with http Package
DESCRIPTION: Demonstrates how to make individual HTTP requests using top-level functions like `post` and `read`. It shows how to handle responses and print status codes and bodies.

SOURCE: <https://pub.dev/packages/http/versions/1>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

var url = Uri.https('example.com', 'whatsit/create');
var response = await http.post(url, body: {'name': 'doodle', 'color': 'blue'});
print('Response status: ${response.statusCode}');
print('Response body: ${response.body}');

print(await http.read(Uri.https('example.com', 'foobar.txt')));
```

---

TITLE: Import http package
DESCRIPTION: Demonstrates how to import the http package into your Dart code to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.11.3%2B8/install>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Install http package
DESCRIPTION: To use the http package, add it as a dependency in your pubspec.yaml file. The latest version is 1.5.0-beta.

SOURCE: <https://pub.dev/packages/http/versions/1.5.0-beta/changelog>

LANGUAGE: yaml
CODE:

```
dependencies:
  http: ^1.5.0-beta
```

---

TITLE: Import http Package (Dart)
DESCRIPTION: Demonstrates how to import the http package into your Dart code to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.6.15%2B3/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Add http Package Dependency (Dart)
DESCRIPTION: Installs the http package as a dependency for a Dart project. This command adds the package to the pubspec.yaml file and implicitly runs `dart pub get`.

SOURCE: <https://pub.dev/packages/http/versions/0.9.2%2B1/install>

LANGUAGE: bash
CODE:

```
dart pub add http
```

LANGUAGE: yaml
CODE:

```
dependencies:
  http: ^0.9.2+1
```

---

TITLE: Installing http_parser Package
DESCRIPTION: Instructions on how to add the http_parser package to a Dart project.

SOURCE: <https://pub.dev/packages/http/_parser/versions>

LANGUAGE: Dart
CODE:

```
dependencies:
  http_parser: ^4.1.2
```

---

TITLE: Install http Package (Flutter)
DESCRIPTION: Command to add the http package as a dependency to your Flutter project.

SOURCE: <https://pub.dev/packages/http/versions/0.13.6/install>

LANGUAGE: bash
CODE:

```
flutter pub add http
```

---

TITLE: Configuring Platform-Specific HTTP Clients
DESCRIPTION: Provides a Dart function example for configuring and returning different HTTP client implementations based on the operating system. It demonstrates how to set up `CronetClient` for Android and `CupertinoClient` for iOS/macOS, falling back to `IOClient` for other platforms.

SOURCE: <https://pub.dev/packages/http/versions/1.5>

LANGUAGE: dart
CODE:

```
Client httpClient() {
  if (Platform.isAndroid) {
    final engine = CronetEngine.build(
        cacheMode: CacheMode.memory,
        cacheMaxSize: 1000000);
    return CronetClient.fromCronetEngine(engine);
  }
  if (Platform.isIOS || Platform.isMacOS) {
    final config = URLSessionConfiguration.ephemeralSessionConfiguration()
      ..cache = URLCache.withCapacity(memoryCapacity: 1000000);
    return CupertinoClient.fromSessionConfiguration(config);
  }
  return IOClient();
}
```

---

TITLE: Making HTTP Requests with http Package
DESCRIPTION: Demonstrates how to make POST requests and read data from a URL using the top-level functions of the http package. It shows how to handle responses and print status codes and bodies.

SOURCE: <https://pub.dev/packages/http/versions/1.5>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart' as http;

var url = Uri.https('example.com', 'whatsit/create');
var response = await http.post(url, body: {'name': 'doodle', 'color': 'blue'});
print('Response status: ${response.statusCode}');
print('Response body: ${response.body}');

print(await http.read(Uri.https('example.com', 'foobar.txt')));
```

---

TITLE: HTTP Package Installation
DESCRIPTION: Installs the 'http' package version 0.13.3 for Dart projects. This package provides a composable, multi-platform, Future-based API for HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.13.3/changelog>

LANGUAGE: Dart
CODE:

```
http: ^0.13.3
```

---

TITLE: Install http Package (Dart)
DESCRIPTION: Command to add the http package as a dependency to your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.13.6/install>

LANGUAGE: bash
CODE:

```
dart pub add http
```

---

TITLE: Install http Package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.7.6%2B4/score>

LANGUAGE: Dart
CODE:

```
http: ^0.7.6+4
```

---

TITLE: Add http Package Dependency (Dart)
DESCRIPTION: Installs the http package as a dependency for a Dart project. This command adds the package to your pubspec.yaml file and implicitly runs `dart pub get`.

SOURCE: <https://pub.dev/packages/http/versions/0.6.13/install>

LANGUAGE: bash
CODE:

```
dart pub add http
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.7.0/score>

LANGUAGE: Dart
CODE:

```
http: ^0.7.0
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.7.3%2B1/score>

LANGUAGE: Dart
CODE:

```
http: ^0.7.3+1
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.8.0/score>

LANGUAGE: Dart
CODE:

```
http: ^0.8.0
```

---

TITLE: Install http Package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.9.2%2B3/score>

LANGUAGE: Dart
CODE:

```
http: ^0.9.2+3
```

---

TITLE: Add http Dependency to pubspec.yaml
DESCRIPTION: Example of how the http dependency is added to the pubspec.yaml file.

SOURCE: <https://pub.dev/packages/http/versions/0.13.6/install>

LANGUAGE: yaml
CODE:

```
dependencies:
  http: ^0.13.6
```

---

TITLE: Install http Package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.8.10%2B3/score>

LANGUAGE: Dart
CODE:

```
http: ^0.8.10+3
```

---

TITLE: Git Repository Operations
DESCRIPTION: This snippet details common Git commands used for setting up and interacting with a remote repository. It includes initializing a repository, adding a remote origin, fetching from the remote, and showing file contents from a specific branch.

SOURCE: <https://pub.dev/packages/http/versions/0.13.6/score/log>

LANGUAGE: bash
CODE:

```
git rev-parse --show-toplevel
git init
git remote add origin https://github.com/dart-lang/http
git remote show origin
git fetch --depth 1 --no-recurse-submodules origin master
git ls-tree -r --name-only --full-tree origin/master
git show origin/master:pkgs/cronet_http/example/pubspec.yaml
git show origin/master:pkgs/cronet_http/pubspec.yaml
git show origin/master:pkgs/cupertino_http/example/pubspec.yaml
git show origin/master:pkgs/cupertino_http/pubspec.yaml
git show origin/master:pkgs/flutter_http_example/pubspec.yaml
git show origin/master:pkgs/http/pubspec.yaml
git show origin/master:pkgs/http2/pubspec.yaml
git show origin/master:pkgs/http_client_conformance_tests/pubspec.yaml
git show origin/master:pkgs/http_multi_server/pubspec.yaml
git show origin/master:pkgs/http_parser/pubspec.yaml
git show origin/master:pkgs/http_profile/pubspec.yaml
git show origin/master:pkgs/ok_http/example/pubspec.yaml
git show origin/master:pkgs/ok_http/pubspec.yaml
git show origin/master:pkgs/web_socket/pubspec.yaml
git show origin/master:pkgs/web_socket_channel/pubspec.yaml
git show origin/master:pkgs/web_socket_conformance_tests/pubspec.yaml
```

---

TITLE: Install http Package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart or Flutter project.

SOURCE: <https://pub.dev/packages/http/versions/1.5.0-beta/score>

LANGUAGE: Dart
CODE:

```
dependencies:
  http: ^1.5.0-beta
```

---

TITLE: Install http Package
DESCRIPTION: Specifies the dependency for the http package in a Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.6.9%2B2/score>

LANGUAGE: Dart
CODE:

```
http: ^0.6.9+2
```

---

TITLE: Install http Package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.3.1%2B1/score>

LANGUAGE: Dart
CODE:

```
http: ^0.3.1+1
```

---

TITLE: Import http package in Dart
DESCRIPTION: Demonstrates how to import the http package into a Dart file to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.11.2/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/1.1.2/score>

LANGUAGE: Dart
CODE:

```
http: ^1.1.2
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.6.17%2B2/score>

LANGUAGE: Dart
CODE:

```
http: ^0.6.17+2
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.6.14/score>

LANGUAGE: Dart
CODE:

```
http: ^0.6.14
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.4.0/score>

LANGUAGE: Dart
CODE:

```
http: ^0.4.0
```

---

TITLE: http 1.2.0 Changelog
DESCRIPTION: This version adds `MockClient.pngResponse` for faking image responses, allows fetching response URLs via `BaseResponseWithUrl`, and enables getting headers as `Map<String, List<String>>` in `BaseResponse`.

SOURCE: <https://pub.dev/packages/http/versions/1.5.0-beta/changelog>

LANGUAGE: changelog
CODE:

```
## 1.2.0 #
  * Add `MockClient.pngResponse`, which makes it easier to fake image responses.
  * Added the ability to fetch the URL of the response through `BaseResponseWithUrl`.
  * Add the ability to get headers as a `Map<String, List<String>>` to `BaseResponse`.

```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B4/score>

LANGUAGE: Dart
CODE:

```
http: ^0.12.0+4
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart or Flutter project.

SOURCE: <https://pub.dev/packages/http/versions/1.5.0-beta.2/score>

LANGUAGE: Dart
CODE:

```
dependencies:
  http: ^1.5.0-beta.2
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B1/score>

LANGUAGE: Dart
CODE:

```
http: ^0.12.0+1
```

---

TITLE: IOClient for Server-Side Environments
DESCRIPTION: This example demonstrates the usage of IOClient, which wraps Dart's built-in `HttpClient` for server-side HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.11.3%2B2/changelog>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart';
import 'package:http/io_client.dart';
import 'dart:io';

// Create an IOClient.
var client = IOClient(HttpClient());

// Make a GET request.
client.get(Uri.parse('https://example.com')).then((response) {
  print(response.body);
});

// Close the client when done.
client.close();
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/0.12.0%2B2/score>

LANGUAGE: Dart
CODE:

```
http: ^0.12.0+2
```

---

TITLE: http Package Usage
DESCRIPTION: Demonstrates how to use the http package for making HTTP requests. This includes common operations like GET and POST requests.

SOURCE: <https://pub.dev/packages/http/versions/1.3.0/score>

LANGUAGE: Dart
CODE:

```
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  final response = await http.get(Uri.parse('https://jsonplaceholder.typicode.com/posts/1'));

  if (response.statusCode == 200) {
    print(response.body);
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}

Future<void> postData() async {
  final response = await http.post(
    Uri.parse('https://jsonplaceholder.typicode.com/posts'),
    headers: <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: jsonEncode(<String, String>{
      'title': 'foo',
      'body': 'bar',
      'userId': '1',
    }),
  );

  if (response.statusCode == 201) {
    print(response.body);
  } else {
    print('Request failed with status: ${response.statusCode}.');
  }
}
```

---

TITLE: Import http Package in Dart Code
DESCRIPTION: Demonstrates how to import the 'http' package into a Dart file to start making HTTP requests.

SOURCE: <https://pub.dev/packages/http/versions/0.5.5/install>

LANGUAGE: dart
CODE:

```
import 'package:http/http.dart';
```

---

TITLE: Add http Package to Dart Project
DESCRIPTION: Installs the http package as a dependency for a Dart project using the `dart pub add` command. This command automatically updates the `pubspec.yaml` file and runs `dart pub get`.

SOURCE: <https://pub.dev/packages/http/versions/0.3.7%2B6/install>

LANGUAGE: bash
CODE:

```
dart pub add http
```

LANGUAGE: yaml
CODE:

```
dependencies:
  http: ^0.3.7+6
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package as a dependency in your Dart project.

SOURCE: <https://pub.dev/packages/http/versions/1.2.2/score>

LANGUAGE: Dart
CODE:

```
http: ^1.2.2
```

---

TITLE: Install http package
DESCRIPTION: Shows how to add the http package to your Dart project dependencies.

SOURCE: <https://pub.dev/packages/http/versions/0.13.0/score>

LANGUAGE: Dart
CODE:

```
http: ^0.13.0
```

---

TITLE: Install http Package
DESCRIPTION: Instructions on how to add the http package as a dependency to your Dart project using the dart pub add command.

SOURCE: <https://pub.dev/packages/http/versions/0.6.6/install>

LANGUAGE: bash
CODE:

```
dart pub add http
```

LANGUAGE: yaml
CODE:

```
dependencies:
  http: ^0.6.6
```
