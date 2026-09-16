<?php
/**
 * ============================================================
 * PLANILOJA ACHADINHOS - CONFIGURAÇÃO DO BANCO DE DADOS HOSTINGER
 * ============================================================
 * Este arquivo define os dados de conexão do MySQL para a Hostinger.
 */

$dbHost = 'localhost';
$dbPort = '3306';
$dbName = 'u566136191_meudocelar2';
$dbUser = 'u566136191_meudocelar2';
$dbPass = 'Second*-2112';

// Permite sobrescrever dinamicamente se houver db_config.json persistido
$possibleConfigFiles = [
    __DIR__ . '/api/db_config.json',
    __DIR__ . '/db_config.json',
    __DIR__ . '/../data/db_config.json',
    __DIR__ . '/data/db_config.json'
];

foreach ($possibleConfigFiles as $cfgFile) {
    if (file_exists($cfgFile)) {
        $raw = @file_get_contents($cfgFile);
        if ($raw) {
            $parsed = @json_decode($raw, true);
            if (!empty($parsed['database'])) $dbName = $parsed['database'];
            if (!empty($parsed['user'])) $dbUser = $parsed['user'];
            if (isset($parsed['password']) && $parsed['password'] !== '') $dbPass = $parsed['password'];
            if (!empty($parsed['host'])) $dbHost = $parsed['host'];
            if (!empty($parsed['port'])) $dbPort = (string)$parsed['port'];
            break;
        }
    }
}
