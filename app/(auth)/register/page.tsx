'use client';

import { Card, Form, Input, Button, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const { Title, Text, Link } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  async function handleSubmit(values: { name: string; email: string; password: string; orgName: string }) {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/core/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Registration failed');
        return;
      }

      message.success('Account created! Please sign in.');
      router.push('/login');
    } catch {
      message.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Create Account</Title>
        <Text type="secondary">Register your organization</Text>
      </div>

      <Form onFinish={handleSubmit} layout="vertical" size="large">
        <Form.Item name="orgName" rules={[{ required: true, message: 'Organization name is required' }]}>
          <Input prefix={<BankOutlined />} placeholder="Organization Name" />
        </Form.Item>
        <Form.Item name="name" rules={[{ required: true, message: 'Your name is required' }]}>
          <Input prefix={<UserOutlined />} placeholder="Your Name" />
        </Form.Item>
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
          <Input prefix={<MailOutlined />} placeholder="Email" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, min: 10, message: 'Min 10 characters' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Register
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Text>Already have an account? </Text>
        <Link href="/login">Sign In</Link>
      </div>
    </Card>
  );
}
