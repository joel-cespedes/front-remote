import { StorageLike, MemoryStorage } from './memory-storage';

describe('StorageLike Interface', () => {
  // Test genérico que funciona para cualquier implementación de StorageLike
  const testStorageLike = (createStorage: () => StorageLike, storageName: string) => {
    describe(`${storageName}`, () => {
      let storage: StorageLike;

      beforeEach(() => {
        storage = createStorage();
      });

      describe('setItem y getItem', () => {
        it('debe almacenar y recuperar un valor string', () => {
          // Act
          storage.setItem('test-key', 'test-value');
          const result = storage.getItem('test-key');

          // Assert
          expect(result).toBe('test-value');
        });

        it('debe almacenar y recuperar strings vacíos', () => {
          // Act
          storage.setItem('empty', '');
          const result = storage.getItem('empty');

          // Assert
          expect(result).toBe('');
        });

        it('debe almacenar y recuperar strings con caracteres especiales', () => {
          // Arrange
          const specialValue = 'áéíóú ñç 中文 🎉 "quotes" \'apostrophes\' \n\t\r';

          // Act
          storage.setItem('special', specialValue);
          const result = storage.getItem('special');

          // Assert
          expect(result).toBe(specialValue);
        });

        it('debe manejar claves con caracteres especiales', () => {
          // Arrange
          const specialKey = 'special-key_with.dots:colons/slashes';

          // Act
          storage.setItem(specialKey, 'value');
          const result = storage.getItem(specialKey);

          // Assert
          expect(result).toBe('value');
        });

        it('debe sobrescribir valores existentes', () => {
          // Arrange
          storage.setItem('overwrite-key', 'first-value');

          // Act
          storage.setItem('overwrite-key', 'second-value');
          const result = storage.getItem('overwrite-key');

          // Assert
          expect(result).toBe('second-value');
        });

        it('debe manejar valores largos', () => {
          // Arrange
          const largeValue = 'x'.repeat(10000);

          // Act
          storage.setItem('large', largeValue);
          const result = storage.getItem('large');

          // Assert
          expect(result).toBe(largeValue);
        });
      });

      describe('getItem comportamiento de claves inexistentes', () => {
        it('debe devolver null para claves que no existen', () => {
          // Act
          const result = storage.getItem('non-existent-key');

          // Assert
          expect(result).toBeNull();
        });

        it('debe devolver null después de limpiar storage', () => {
          // Arrange
          storage.setItem('temp-key', 'temp-value');
          storage.clear();

          // Act
          const result = storage.getItem('temp-key');

          // Assert
          expect(result).toBeNull();
        });
      });

      describe('removeItem', () => {
        it('debe eliminar una clave existente', () => {
          // Arrange
          storage.setItem('to-remove', 'value');

          // Act
          storage.removeItem('to-remove');
          const result = storage.getItem('to-remove');

          // Assert
          expect(result).toBeNull();
        });

        it('no debe fallar al eliminar clave inexistente', () => {
          // Act & Assert - no debe lanzar error
          expect(() => storage.removeItem('non-existent')).not.toThrow();
        });

        it('debe eliminar solo la clave especificada', () => {
          // Arrange
          storage.setItem('keep1', 'value1');
          storage.setItem('remove', 'value2');
          storage.setItem('keep2', 'value3');

          // Act
          storage.removeItem('remove');

          // Assert
          expect(storage.getItem('keep1')).toBe('value1');
          expect(storage.getItem('remove')).toBeNull();
          expect(storage.getItem('keep2')).toBe('value3');
        });
      });

      describe('clear', () => {
        it('debe eliminar todos los elementos', () => {
          // Arrange
          storage.setItem('key1', 'value1');
          storage.setItem('key2', 'value2');
          storage.setItem('key3', 'value3');

          // Act
          storage.clear();

          // Assert
          expect(storage.getItem('key1')).toBeNull();
          expect(storage.getItem('key2')).toBeNull();
          expect(storage.getItem('key3')).toBeNull();
        });

        it('no debe fallar en storage vacío', () => {
          // Act & Assert - no debe lanzar error
          expect(() => storage.clear()).not.toThrow();
        });

        it('debe funcionar múltiples veces consecutivas', () => {
          // Arrange
          storage.setItem('test', 'value');

          // Act
          storage.clear();
          storage.clear();
          storage.clear();

          // Assert
          expect(storage.getItem('test')).toBeNull();
        });
      });

      describe('operaciones secuenciales', () => {
        it('debe manejar operaciones mixtas correctamente', () => {
          // Act
          storage.setItem('a', 'value-a');
          storage.setItem('b', 'value-b');
          expect(storage.getItem('a')).toBe('value-a');

          storage.removeItem('a');
          expect(storage.getItem('a')).toBeNull();
          expect(storage.getItem('b')).toBe('value-b');

          storage.setItem('c', 'value-c');
          storage.clear();
          expect(storage.getItem('b')).toBeNull();
          expect(storage.getItem('c')).toBeNull();
        });
      });
    });
  };

  // Test MemoryStorage específicamente
  testStorageLike(() => new MemoryStorage(), 'MemoryStorage');

  // Test localStorage si está disponible (para comparar comportamientos)
  if (typeof localStorage !== 'undefined') {
    testStorageLike(() => {
      localStorage.clear(); // Limpiar antes de cada test
      return localStorage;
    }, 'localStorage (comparación)');
  }
});

describe('MemoryStorage específicos', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('aislamiento de instancias', () => {
    it('debe mantener datos separados entre instancias', () => {
      // Arrange
      const storage1 = new MemoryStorage();
      const storage2 = new MemoryStorage();

      // Act
      storage1.setItem('shared-key', 'value1');
      storage2.setItem('shared-key', 'value2');

      // Assert
      expect(storage1.getItem('shared-key')).toBe('value1');
      expect(storage2.getItem('shared-key')).toBe('value2');
    });

    it('debe limpiar solo su propia instancia', () => {
      // Arrange
      const storage1 = new MemoryStorage();
      const storage2 = new MemoryStorage();
      storage1.setItem('key', 'value1');
      storage2.setItem('key', 'value2');

      // Act
      storage1.clear();

      // Assert
      expect(storage1.getItem('key')).toBeNull();
      expect(storage2.getItem('key')).toBe('value2');
    });
  });

  describe('manejo de memoria', () => {
    it('debe liberar memoria al eliminar elementos', () => {
      // Arrange
      storage.setItem('test', 'value');
      const initialSize = (storage as any).data.size;

      // Act
      storage.removeItem('test');
      const finalSize = (storage as any).data.size;

      // Assert
      expect(initialSize).toBe(1);
      expect(finalSize).toBe(0);
    });

    it('debe liberar toda la memoria al hacer clear', () => {
      // Arrange
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      storage.setItem('key3', 'value3');

      // Act
      storage.clear();
      const size = (storage as any).data.size;

      // Assert
      expect(size).toBe(0);
    });
  });

  describe('consistencia de tipos', () => {
    it('debe mantener tipos string incluso para valores que parecen números', () => {
      // Act
      storage.setItem('number', '123');
      const result = storage.getItem('number');

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('123');
    });

    it('debe mantener tipos string para valores booleanos', () => {
      // Act
      storage.setItem('boolean', 'true');
      const result = storage.getItem('boolean');

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('true');
    });

    it('debe manejar null como string cuando se almacena', () => {
      // Act
      storage.setItem('null-string', 'null');
      const result = storage.getItem('null-string');

      // Assert
      expect(result).toBe('null');
      expect(result).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('debe manejar claves vacías', () => {
      // Act
      storage.setItem('', 'empty-key-value');
      const result = storage.getItem('');

      // Assert
      expect(result).toBe('empty-key-value');
    });

    it('debe manejar claves con solo espacios en blanco', () => {
      // Act
      storage.setItem('   ', 'whitespace-key');
      const result = storage.getItem('   ');

      // Assert
      expect(result).toBe('whitespace-key');
    });

    it('debe distinguir entre claves similares', () => {
      // Act
      storage.setItem('key', 'value1');
      storage.setItem('key ', 'value2');
      storage.setItem(' key', 'value3');

      // Assert
      expect(storage.getItem('key')).toBe('value1');
      expect(storage.getItem('key ')).toBe('value2');
      expect(storage.getItem(' key')).toBe('value3');
    });
  });

  describe('compatibilidad con API de localStorage', () => {
    it('debe implementar exactamente la misma interfaz que localStorage', () => {
      // Assert - verificar que los métodos existen y tienen las firmas correctas
      expect(typeof storage.getItem).toBe('function');
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.removeItem).toBe('function');
      expect(typeof storage.clear).toBe('function');

      // Test comportamiento idéntico
      expect(storage.getItem('non-existent')).toBeNull();
      expect(() => storage.setItem('test', 'value')).not.toThrow();
      expect(() => storage.removeItem('non-existent')).not.toThrow();
      expect(() => storage.clear()).not.toThrow();
    });
  });

  describe('performance y escalabilidad', () => {
    it('debe manejar muchas operaciones eficientemente', () => {
      // Arrange
      const iterations = 1000;
      const startTime = performance.now();

      // Act
      for (let i = 0; i < iterations; i++) {
        storage.setItem(`key-${i}`, `value-${i}`);
      }

      for (let i = 0; i < iterations; i++) {
        storage.getItem(`key-${i}`);
      }

      for (let i = 0; i < iterations / 2; i++) {
        storage.removeItem(`key-${i}`);
      }

      const endTime = performance.now();

      // Assert - no debe tomar más de 100ms para 1000 operaciones
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('debe mantener rendimiento consistente después de clear', () => {
      // Arrange
      for (let i = 0; i < 100; i++) {
        storage.setItem(`key-${i}`, `value-${i}`);
      }

      // Act
      const startTime = performance.now();
      storage.clear();
      storage.setItem('new-key', 'new-value');
      const result = storage.getItem('new-key');
      const endTime = performance.now();

      // Assert
      expect(result).toBe('new-value');
      expect(endTime - startTime).toBeLessThan(10); // Operación rápida
    });
  });
});
