Prueba Técnica para Desarrollador de Software Backend

Descripción:
El objetivo de esta prueba técnica es evaluar tus conocimientos en TypeScript, NestJS, Firebase
y la implementación de Clean Architecture. Deberás desarrollar un proyecto en NestJS que
implemente una funcionalidad específica, incluyendo la ejecución de un evento que se dispare
al insertar un registro en la base de datos.
Requisitos del Proyecto
1. Lenguaje de programación:
○ TypeScript
2. Framework:
○ NestJS
3. Base de datos:
○ Firebase
4. Arquitectura:
○ Clean Architecture


Funcionalidad Específica
Debes desarrollar una aplicación que permita capturar una entidad User con los siguientes
campos:
● id (generado automáticamente)
● username
● email
● password (opcional al crear)
Al insertar un nuevo usuario en la base de datos:
1. Si no se proporciona un password, se debe generar uno automáticamente.
2. El password generado debe ser seguro.
3. El registro debe actualizarse con el password generado.
Instrucciones
1. Configuración del Proyecto:
○ Crea un nuevo proyecto en NestJS.
○ Configura Firebase como la base de datos para almacenar la entidad User.
2. Modelado de la Entidad User:
○ Define la entidad User con los campos mencionados.
3. Implementación de Clean Architecture:
○ Organiza tu proyecto utilizando Clean Architecture. Asegúrate de separar las
capas de dominio, aplicación, infraestructura y presentación.

4. Creación del Servicio para Usuarios:
○ Implementa un servicio en NestJS que permita insertar un nuevo usuario en
Firebase.
○ Si el password no se proporciona, genera uno automáticamente.
5. Ejecución de un Evento:
○ Implementa un evento que se dispare al insertar un nuevo usuario.
○ El evento debe generar un password seguro y actualizar el registro en Firebase.

6. Documentación y Pruebas:
○ Proporciona documentación básica sobre cómo configurar y ejecutar el
proyecto.
○ Incluye pruebas unitarias para las funciones clave, especialmente la generación
de password y la actualización del usuario.

Evaluación
El proyecto será evaluado en base a los siguientes criterios:
1. Organización del Código:
○ Uso adecuado de Clean Architecture.
○ Estructura del proyecto y modularización del código.
2. Funcionalidad:
○ Implementación correcta de la inserción y actualización de usuarios.
○ Generación segura de contraseñas.
3. Uso de Firebase:
○ Configuración y uso adecuado de Firebase como base de datos.
4. Documentación y Pruebas:
○ Claridad y calidad de la documentación proporcionada.
○ Cobertura y calidad de las pruebas unitarias.


Pistas y Recomendaciones
● Configuración de Firebase:
○ Puedes utilizar Firebase Admin SDK para interactuar con Firebase desde el
backend.

● Generación de Contraseñas:
○ Asegúrate de utilizar librerías conocidas para la generación de contraseñas
seguras, como bcrypt.
● Organización del Proyecto:
○ Sigue las mejores prácticas de Clean Architecture, asegurando la separación de
responsabilidades y la independencia de cada capa.

Configuración del Emulador de Firebase:
● Instala el Firebase CLI: npm install -g firebase-tools.
● Inicializa Firebase en tu proyecto: firebase init.
● Selecciona los emuladores que necesitas (Firestore, Authentication, etc.).
● Configura tu aplicación NestJS para conectarse al emulador. Puedes hacerlo
estableciendo las credenciales y URL del emulador en tu configuración.
● Ejecuta los emuladores con el comando: firebase emulators:start.

Buena suerte y esperamos ver tu mejor trabajo.