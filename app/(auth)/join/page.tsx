'use client';

import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, KeyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const { Title, Text, Link } = Typography;

export default function JoinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { code: string; name: string; email: string; password: string }) {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/core/tenants/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to join');
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
        <Title level={3} style={{ margin: 0 }}>Join Organization</Title>
        <Text type="secondary">Enter your invitation code</Text>
      </div>

      <Form onFinish={handleSubmit} layout="vertical" size="large">
        <Form.Item name="code" rules={[{ required: true, message: 'Invitation code is required' }]}>
          <Input prefix={<KeyOutlined />} placeholder="Invitation Code" />
        </Form.Item>
        <Form.Item name="name" rules={[{ required: true, message: 'Name is required' }]}>
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
            Join
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
