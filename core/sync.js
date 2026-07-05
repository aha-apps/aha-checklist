// SyncEngine — Export/Import de datos en formato .ateje-backup
// window.SyncEngine expuesto globalmente
(function () {
  'use strict';

  if (typeof window.SyncEngine !== 'undefined') return;

  var EXCLUDE_TABLES = ['modelos_cache', '_ia_sqlite'];

  window.SyncEngine = {
    _password: '',

    setPassword: function (pwd) {
      this._password = pwd || '';
    },

    exportarBackup: function (password) {
      var pwd = password || this._password;
      var self = this;
      UI.toast('Preparando respaldo...', 'info');
      var appName = window.APP_CONFIG && window.APP_CONFIG.app && window.APP_CONFIG.app.nombre || 'aha-checklist';
      var tables = {};
      var files = [];

      var dbRef = window.db;
      if (!dbRef) {
        UI.toast('Base de datos no disponible', 'error');
        return Promise.reject(new Error('No DB'));
      }

      var metas = [];

      if (dbRef._files) {
        metas.push(
          dbRef._files.toArray().then(function (fileRows) { files = fileRows; })
        );
      }

      var dbTables = dbRef.tables || [];
      for (var i = 0; i < dbTables.length; i++) {
        (function (table) {
          if (EXCLUDE_TABLES.indexOf(table.name) !== -1) return;
          if (table.name === '_files' || table.name === '_file_blobs') return;
          metas.push(
            table.toArray().then(function (records) {
              if (records.length) tables[table.name] = records;
            })
          );
        })(dbTables[i]);
      }

      return Promise.all(metas).then(function () {
        var recordCount = 0;
        for (var t in tables) {
          if (tables.hasOwnProperty(t)) recordCount += tables[t].length;
        }

        var data = {
          version: 2,
          app: appName,
          exportedAt: new Date().toISOString(),
          recordCount: recordCount,
          tables: tables,
          files: files
        };

        var json = JSON.stringify(data, null, 2);
        var compressed;

        try {
          compressed = window.pako ? pako.gzip(json) : json;
        } catch (e) {
          compressed = json;
        }

        var blob;
        if (pwd) {
          var encrypted = CryptoJS.AES.encrypt(
            typeof compressed === 'string' ? compressed : new TextDecoder().decode(compressed),
            pwd
          ).toString();
          blob = new Blob([encrypted], { type: 'application/octet-stream' });
        } else {
          blob = new Blob([compressed], { type: 'application/octet-stream' });
        }

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = appName + '-' + ts + '.ateje-backup';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        UI.toast('Respaldo exportado (' + (blob.size / 1024).toFixed(1) + ' KB)', 'success');
        return true;
      }).catch(function (err) {
        UI.toast('Error al exportar: ' + (err.message || 'Error'), 'error');
        throw err;
      });
    },

    importarBackup: function (file, password) {
      var pwd = password || this._password;
      var self = this;
      UI.toast('Importando respaldo...', 'info');

      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          var content = reader.result;

          try {
            var json;
            if (pwd) {
              var decrypted = CryptoJS.AES.decrypt(content, pwd).toString(CryptoJS.enc.Utf8);
              if (!decrypted) { UI.toast('Contrase\u00f1a incorrecta', 'error'); reject(new Error('Wrong password')); return; }
              json = JSON.parse(decrypted);
            } else {
              try {
                json = JSON.parse(content);
              } catch (e) {
                try {
                  var decompressed = pako.ungzip(content, { to: 'string' });
                  json = JSON.parse(decompressed);
                } catch (e2) {
                  json = JSON.parse(content);
                }
              }
            }

            if (!json || !json.tables) {
              UI.toast('Formato de respaldo inv\u00e1lido', 'error');
              reject(new Error('Invalid format'));
              return;
            }

            var tableNames = Object.keys(json.tables);
            var ps = [];
            var dbRef = window.db;
            if (!dbRef) { reject(new Error('No DB')); return; }

            UI.loading(true, 'Restaurando datos...');

            for (var i = 0; i < tableNames.length; i++) {
              (function (tableName) {
                var records = json.tables[tableName];
                if (!records || !records.length) return;
                for (var j = 0; j < dbRef.tables.length; j++) {
                  if (dbRef.tables[j].name === tableName) {
                    ps.push(dbRef.tables[j].bulkPut(records));
                    break;
                  }
                }
              })(tableNames[i]);
            }

            // Restaurar archivos
            if (json.files && json.files.length && dbRef._files) {
              ps.push(dbRef._files.bulkPut(json.files));
            }

            Promise.all(ps).then(function () {
              UI.loading(false);
              UI.toast('Respaldo importado (' + (json.recordCount || '') + ' registros)', 'success');
              resolve(true);
            }).catch(function (err) {
              UI.loading(false);
              UI.toast('Error al importar: ' + (err.message || 'Error'), 'error');
              reject(err);
            });
          } catch (err) {
            UI.loading(false);
            UI.toast('Error al importar: ' + (err.message || 'Error'), 'error');
            reject(err);
          }
        };
        reader.onerror = function () { reject(new Error('Error al leer archivo')); };
        reader.readAsText(file);
      });
    }
  };
})();
