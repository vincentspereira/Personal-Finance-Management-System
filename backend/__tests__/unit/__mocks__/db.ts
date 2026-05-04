// Shared mock for the db module across all service tests
const queryMock = jest.fn();
const getClientMock = jest.fn();

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

getClientMock.mockResolvedValue(mockClient);

export { queryMock as query, getClientMock as getClient, mockClient, queryMock, getClientMock };
export const pool = { end: jest.fn(), connect: jest.fn() };
