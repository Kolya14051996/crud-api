import http, {IncomingMessage, ServerResponse} from 'http';
import {v4 as uuidv4} from 'uuid';
import url, {UrlWithParsedQuery} from 'url';

interface UserData {
	username: string;
	age: number;
	hobbies: string[];
}

interface User {
	id: string;
	username: string;
	age: number;
	hobbies: string[];
}

let users: User[] = [];

const isValidUserData = (userData: UserData) => {
	return (
		typeof userData === 'object' &&
		userData.username &&
		typeof userData.username === 'string' &&
		userData.age &&
		typeof userData.age === 'number' &&
		userData.hobbies &&
		Array.isArray(userData.hobbies)
	);
};

const isValidUUID = (uuid: string): boolean => {
	return (
		uuid.match(
			/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
		) !== null
	);
};

const getAllUsers = (): User[] => {
	return users;
};

const getUserById = (userId: string): User | undefined => {
	return users.find((user) => user.id === userId);
};

const updateUser = (
	userId: string,
	userData: Partial<UserData>
): User | null => {
	const userIndex = users.findIndex((user) => user.id === userId);
	if (userIndex !== -1) {
		users[userIndex] = {
			...users[userIndex],
			username: userData.username || users[userIndex].username,
			age: userData.age || users[userIndex].age,
			hobbies: userData.hobbies || users[userIndex].hobbies,
		};
		return users[userIndex];
	}
	return null;
};

const deleteUser = (userId: string) => {
	users = users.filter((user) => user.id !== userId);
};

const server = http.createServer(
	async (req: IncomingMessage, res: ServerResponse) => {
			try {
					const parsedUrl: UrlWithParsedQuery = url.parse(req.url || '', true);
					const { pathname } = parsedUrl;

					if (req.method === 'GET' && pathname === '/api/users') {
							const allUsers = getAllUsers();
							res.writeHead(200, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify(allUsers));
					} else if (
							req.method === 'GET' &&
							pathname &&
							pathname.startsWith('/api/users')
					) {
							const userId = `${pathname.slice('/api/users/'.length)}`;
							if (!isValidUUID(userId)) {
									res.writeHead(400, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify({ error: 'Invalid userId format' }));
									return;
							}

							const user = getUserById(userId);
							if (user) {
									res.writeHead(200, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify(user));
							} else {
									res.writeHead(404, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify({ error: 'User not found' }));
							}
					} else if (req.method === 'POST' && pathname === '/api/users') {
							let body = '';
							req.on('data', (chunk) => {
									body += chunk.toString();
							});
							req.on('end', async () => {
									try {
											const userData: UserData = JSON.parse(body);

											if (
													!userData.username ||
													typeof userData.username !== 'string' ||
													!userData.age ||
													typeof userData.age !== 'number' ||
													!userData.hobbies ||
													!Array.isArray(userData.hobbies)
											) {
													res.writeHead(400, { 'Content-Type': 'application/json' });
													res.end(JSON.stringify({ error: 'Missing or invalid required fields' }));
													return;
											}

											const userId = uuidv4();

											const newUser = {
													id: userId,
													username: userData.username,
													age: userData.age,
													hobbies: userData.hobbies,
											};
											users.push(newUser);

											res.writeHead(201, { 'Content-Type': 'application/json' });
											res.end(JSON.stringify(newUser));
									} catch (error) {
											res.writeHead(400, { 'Content-Type': 'application/json' });
											res.end(JSON.stringify({ error: 'Invalid JSON format' }));
									}
							});
					} else if (
							req.method === 'PUT' &&
							pathname &&
							pathname.startsWith('/api/users')
					) {
							const userId = pathname.slice('/api/users/'.length);
							if (!isValidUUID(userId)) {
									res.writeHead(400, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify({ error: 'Invalid userId format' }));
									return;
							}
							const user = getUserById(userId);
							if (!user) {
									res.writeHead(404, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify({ error: 'User not found' }));
									return;
							}

							let body = '';

							req.on('data', (chunk) => {
									body += chunk.toString();
							});

							req.on('end', () => {
									try {
											const userData = JSON.parse(body);
											if (!isValidUserData(userData)) {
													res.writeHead(400, { 'Content-Type': 'application/json' });
													res.end(JSON.stringify({ error: 'Missing or invalid required fields' }));
													return;
											}
											const updatedUser = updateUser(userId, userData);
											res.writeHead(200, { 'Content-Type': 'application/json' });
											res.end(JSON.stringify(updatedUser));
									} catch (error) {
											res.writeHead(400, { 'Content-Type': 'application/json' });
											res.end(JSON.stringify({ error: 'Invalid JSON format' }));
									}
							});
					} else if (
							req.method === 'DELETE' &&
							pathname &&
							pathname.startsWith('/api/users')
					) {
							const userId = pathname.slice('/api/users/'.length);
							if (!isValidUUID(userId)) {
									res.writeHead(400, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify({ error: 'Invalid userId format' }));
									return;
							}
							const user = getUserById(userId);
							if (!user) {
									res.writeHead(404, { 'Content-Type': 'application/json' });
									res.end(JSON.stringify({ error: 'User not found' }));
									return;
							}

							deleteUser(userId);
							res.writeHead(204, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ message: 'User deleted successfully' }));
					} else {
							res.writeHead(404, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Not Found' }));
					}
			} catch (error) {
					console.error('Server Error:', error);
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Internal Server Error' }));
			}
	}
);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
