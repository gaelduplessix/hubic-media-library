/**
 * Helper for IndexedDB
 * @class IDBHelper
 */
var IDBHelper = {
    dbs: {},
    q: null, // To be filled
};

/**
 * Retrieve an object from the DB
 * @method get
 * @param {String} DBName The DB name
 * @param {String} objectStore A table name
 * @param {String} key The key to retrieve
 */
IDBHelper.get = function (DBName, objectStore, key) {
    var $this = this;

    return IDBHelper.q(function (resolve, reject) {
        $this.initIDB(DBName, objectStore, function () {
            var request,
                transaction = $this.dbs[DBName].transaction([objectStore], 'readonly'),
                store = transaction.objectStore(objectStore);

            transaction.onerror = function () {
                console.error('IDB: could not load from DB');
                reject();
            };

            // Finally retrieve the object from an indexed DB table (so simple, isn't it ?)
            request = store.get(key);
            request.onsuccess = function () {
                if (request.result) {
                    resolve(request.result);
                } else {
                    resolve(null);
                }
            };
            request.onerror = function () {
                reject();
            };
        });
    });
};

/**
 * Save an object to the DB
 * @method save
 * @param {String} DBName The DB name
 * @param {String} objectStore A table name
 * @param {*} object The thing to put to the DB
 * @param {String} key The key to save/update
 */
IDBHelper.save = function (DBName, objectStore, object, key) {
    var $this = this;

    return IDBHelper.q(function (resolve, reject) {
        $this.initIDB(DBName, objectStore, function () {
            var request,
                transaction = $this.dbs[DBName].transaction([objectStore], 'readwrite'),
                store = transaction.objectStore(objectStore);

            transaction.oncomplete = function () {
                resolve();
            };
            transaction.onerror = function () {
                reject();
            };

            // Finally add that object to an indexed DB store (so simple, isn't it ?)
            request = store.put(object, key);
        });
    });
};

/**
 * Remove an object from the DB/Store
 * @method remove
 * @param {String} DBName The DB name
 * @param {String} objectStore A table name
 * @param {String} key The key to retrieve
 */
IDBHelper.remove = function (DBName, objectStore, key) {
    var $this = this;

    return IDBHelper.q(function (resolve, reject) {
        $this.initIDB(DBName, objectStore, function () {
            var request,
                transaction = $this.dbs[DBName].transaction([objectStore], 'readwrite'),
                store = transaction.objectStore(objectStore);

            transaction.oncomplete = function () {
                resolve();
            };
            transaction.onerror = function () {
                reject();
            };

            // Finally delete that object from an indexed DB store (so simple, isn't it ?)
            request = store.delete(key);
        });
    });
};

/**
 * Clear a store.
 * @method clearStore
 * @param {String} DBName The DB name
 * @param {String} objectStore A store name
 */
IDBHelper.clearStore = function (DBName, objectStore) {
    var $this = this;

    return IDBHelper.q(function (resolve, reject) {
        $this.initIDB(DBName, objectStore, function () {
            var request,
                transaction = $this.dbs[DBName].transaction([objectStore], 'readwrite'),
                store = transaction.objectStore(objectStore);

            transaction.oncomplete = function () {
                resolve();
            };
            transaction.onerror = function () {
                reject();
            };

            request = store.clear();
        });
    });
};

/**
 * Remove a store.
 * @method removeStore
 * @param {String} DBName The DB name
 * @param {String} objectStore A store name
 */
IDBHelper.removeStore = function (DBName, objectStore) {
    var $this = this;

    return IDBHelper.q(function (resolve, reject) {
        $this.initIDB(DBName, objectStore, function () {
            var transaction = $this.dbs[DBName].deleteObjectStore(objectStore);

            transaction.oncomplete = function () {
                resolve();
            };
            transaction.onerror = function () {
                reject();
            };
        });
    });
};

/**
 * Init the indexedDB
 * @method initIDB
 * @param {String} DBName the DB name
 * @param {String} ObjectStore a table name
 * @param {Function} [work] The task to do on completion. The function WILL be called asynchronously
 *                          (thanks to the IDB API) meaning that the function WILL be decoupled from
 *                          the worker task and thus MUST NOT call any function of the Worker API
 *                          (nominatively schedule() and postIntermediateResult()).
 * @private
 */
IDBHelper.initIDB = function (DBName, ObjectStore, work) {
    var $this = this, request, r, i, l;

    // Open and init the DB, if needed
    if (!this.dbs[DBName]) {
        // Open the DB
        request = window.indexedDB.open(DBName, 1);
        request.onerror = function (evt) {
            console.error('IDB: failed to open the DB: ', evt);
        };
        request.onsuccess = function (evt) {
            $this.dbs[DBName] = evt.target.result;

            $this.dbs[DBName].onerror = function (evt) {
                console.error('IDB: IDB Error: ', evt);
            };

            r = $this.dbs[DBName].objectStoreNames;
            for (i = 0, l = r.length; i < l; ++i) {
                if (r[i] === ObjectStore) {
                    r = null;
                    break;
                }
            }
            if (r) {
                request = $this.dbs[DBName].createObjectStore(ObjectStore);
                request.onsuccess = work;
                return;
            }

            if (work) {
                work();
            }
        };
        request.onupgradeneeded = function (evt) {
            $this.dbs[DBName] = evt.target.result;

            request = $this.dbs[DBName].createObjectStore(ObjectStore);
        };
    } else if (work) {
        r = $this.dbs[DBName].objectStoreNames;
        for (i = 0, l = r.length; i < l; ++i) {
            if (r[i] === ObjectStore) {
                r = null;
                break;
            }
        }
        if (r) {
            request = $this.dbs[DBName].createObjectStore(ObjectStore, {
                keyPath: '_key',
            });
            request.onsuccess = work;
            return;
        }
        // Do the requested work
        work();
    }
};

export default IDBHelper;
