// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { join } from 'path';
import { ID3v2 } from '../src/index';

describe('An id3v2 tag', () => {
  let tag: ID3v2;

  it('should return nothing on invalid file', () => {
    tag = new ID3v2(join(__dirname, 'index-test.js'));
    assert.isUndefined(tag.genre);
    assert.isUndefined(tag.track);
    assert.isUndefined(tag.album);
    assert.isUndefined(tag.title);
    assert.isUndefined(tag.year);
    assert.isUndefined(tag.artist);
  });

  describe('when given a valid file', () => {
    before(() => {
      tag = new ID3v2(join(__dirname, 'test.mp3'));
    });

    it('should contain id3 tag data', () => {
      assert.equal(tag.genre, 'Blues');
      assert.equal(tag.track, '01');
      assert.equal(tag.album, 'album-title');
      assert.equal(tag.title, 'title');
      assert.equal(tag.year, '2000');
      assert.equal(tag.artist, 'artist');
      assert.deepEqual(tag.text, [
        {
          description: 'descr',
          value: 'value'
        },
        {
          description: 'descr2',
          value: 'value2'
        }
      ]);
      assert.equal(tag.set, '1');
      assert.equal(tag.length, '12345');
      assert.deepEqual(tag.popularimeter, {
        email: 'id',
        rating: 64,
        counter: undefined
      });
    });
  });
});
