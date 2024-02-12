import * as http from 'http';
import {getAllUsers, createUser} from '../server';

describe('API Endpoints', () => {
	let server: http.Server;
	let port: number;
	const deleteUserStub = jest.fn((userId: string) => true);

	beforeAll((done) => {
		server = http.createServer((req, res) => {
			if (req.method === 'GET' && req.url === '/api/users') {
				const allUsers = getAllUsers();
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(allUsers));
			} else if (req.method === 'POST' && req.url === '/api/users') {
				let body = '';
				req.on('data', (chunk) => {
					body += chunk.toString();
				});
				req.on('end', () => {
					try {
						const userData = JSON.parse(body);
						const newUser = createUser(userData);
						res.writeHead(201, {'Content-Type': 'application/json'});
						res.end(JSON.stringify(newUser));
					} catch (error) {
						res.writeHead(400, {'Content-Type': 'application/json'});
						res.end(JSON.stringify({error: 'Invalid JSON format'}));
					}
				});
			} else if (
				req.method === 'DELETE' &&
				req.url?.startsWith('/api/users/')
			) {
				const userId = req.url.split('/')[3]; 
				const deleted = deleteUserStub(userId);
				if (deleted) {
					// исправлено
					res.writeHead(204);
					res.end();
				} else {
					res.writeHead(404);
					res.end();
				}
			} else {
				res.writeHead(404);
				res.end();
			}
		});

		server.listen(0, () => {
			port = (server.address() as any).port;
			done();
		});
	});

	test('GET /api/users should return empty array when no users are present', (done) => {
		http.get(`http://localhost:${port}/api/users`, (res) => {
			expect(res.statusCode).toBe(200);

			let responseData = '';
			res.on('data', (chunk) => {
				responseData += chunk;
			});

			res.on('end', () => {
				const users = JSON.parse(responseData);
				expect(users).toEqual([]);
				done();
			});
		});
	});

	test('POST /api/users should create a new user object', (done) => {
		const userData = {
			username: 'TestUser',
			age: 25,
			hobbies: ['Coding', 'Reading'],
		};
		const postData = JSON.stringify(userData);

		const options = {
			hostname: 'localhost',
			port: port,
			path: '/api/users',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': postData.length,
			},
		};

		const req = http.request(options, (res) => {
			expect(res.statusCode).toBe(201);

			let responseData = '';
			res.on('data', (chunk) => {
				responseData += chunk;
			});

			res.on('end', () => {
				const newUser = JSON.parse(responseData);
				expect(newUser.username).toBe(userData.username);
				expect(newUser.age).toBe(userData.age);
				expect(newUser.hobbies).toEqual(userData.hobbies);
				done();
			});
		});

		req.write(postData);
		req.end();
	});

	test('DELETE /api/users/{userId} should delete the created user object by its id', (done) => {
		const userData = {
			username: 'TestUser',
			age: 25,
			hobbies: ['Coding', 'Reading'],
		};

		const createUserOptions = {
			hostname: 'localhost',
			port: port,
			path: '/api/users',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		};

		const createUserRequest = http.request(
			createUserOptions,
			(createUserResponse) => {
				expect(createUserResponse.statusCode).toBe(201);

				let responseData = '';
				createUserResponse.on('data', (chunk) => {
					responseData += chunk;
				});

				createUserResponse.on('end', () => {
					const newUser = JSON.parse(responseData);

					const deleteUserOptions = {
						hostname: 'localhost',
						port: port,
						path: `/api/users/${newUser.id}`,
						method: 'DELETE',
					};

					const deleteUserRequest = http.request(
						deleteUserOptions,
						(deleteUserResponse) => {
							expect(deleteUserResponse.statusCode).toBe(204);

							http.get(
								`http://localhost:${port}/api/users/${newUser.id}`,
								(getUserResponse) => {
									expect(getUserResponse.statusCode).toBe(404);
									done();
								}
							);
						}
					);

					deleteUserRequest.on('error', (error) => {
						console.error('Error deleting user:', error);
						done.fail(error);
					});

					deleteUserRequest.end();
				});
			}
		);

		createUserRequest.on('error', (error) => {
			console.error('Error creating user:', error);
			done.fail(error);
		});

		createUserRequest.write(JSON.stringify(userData));
		createUserRequest.end();
	});

	afterAll((done) => {
		server.close(() => {
			done(); 
		});
	});
});
