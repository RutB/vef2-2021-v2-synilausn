import faker from 'faker';

export function fakeSignatures() {
  const randName = faker.name.findName();
  const randSent = faker.lorem.sentence();
  const datenew = new Date();
  const dateold = new Date(datenew - 12096e5);
  const randDate = new Date(faker.date.between(dateold, datenew));
  const randKennitala = Math.random().toString().slice(2, 12);
  const randAnon = Math.random() <= 0.5;

  const data = [randName, randKennitala, randDate, randSent, randAnon];
  return data;
}
